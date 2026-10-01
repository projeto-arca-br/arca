import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

import pymysql
from fastapi import FastAPI, HTTPException, Response
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator

from . import __version__
from .banco import cursor, esperar_banco, rodar_migracoes
from .biblioteca import varrer_biblioteca
from .configuracao import configuracoes
from .verificacoes import verificar_todos

log = logging.getLogger("arca.portal")
BASE = Path(__file__).parent


@asynccontextmanager
async def ciclo_de_vida(_: FastAPI):
    esperar_banco()
    aplicadas = rodar_migracoes()
    log.info("migrações aplicadas: %s", aplicadas or "nenhuma pendente")
    yield


app = FastAPI(
    title="API do Portal Arca",
    version=__version__,
    docs_url=None,  # /api/docs é servido abaixo com assets locais
    redoc_url=None,
    openapi_url="/api/openapi.json",
    lifespan=ciclo_de_vida,
)


def _iso(dt: datetime | None) -> str | None:
    return dt.replace(microsecond=0, tzinfo=timezone.utc).isoformat().replace("+00:00", "Z") if dt else None


# ---------- documentação offline ----------
app.mount("/api/docs-assets", StaticFiles(directory=BASE / "static/vendor/swagger"), name="docs-assets")


@app.get("/api/docs", include_in_schema=False)
def documentacao():
    return get_swagger_ui_html(
        openapi_url="/api/openapi.json",
        title="API do Portal Arca",
        swagger_js_url="/api/docs-assets/swagger-ui-bundle.js",
        swagger_css_url="/api/docs-assets/swagger-ui.css",
        swagger_favicon_url="data:,",
    )


# ---------- saúde ----------
class Saude(BaseModel):
    status: Literal["ok", "degradado"]
    banco: bool
    versao: str


@app.get("/api/saude", response_model=Saude, tags=["saude"])
def saude(resposta: Response):
    try:
        with cursor() as cur:
            cur.execute("SELECT 1")
        return Saude(status="ok", banco=True, versao=__version__)
    except Exception:
        resposta.status_code = 503
        return Saude(status="degradado", banco=False, versao=__version__)


# ---------- serviços ----------
class EstadoServico(BaseModel):
    identificador: str
    nome: str
    descricao: str
    caminho: str
    perfil: str | None
    estado: Literal["online", "offline", "desativado"]
    latencia_ms: int | None


@app.get("/api/servicos", response_model=list[EstadoServico], tags=["servicos"])
def listar_servicos():
    with cursor() as cur:
        cur.execute("SELECT * FROM servicos ORDER BY posicao, id")
        linhas = cur.fetchall()
    resultados = verificar_todos(linhas)
    try:  # o registro de saúde é melhor-esforço: nunca derruba a resposta
        with cursor() as cur:
            cur.executemany(
                "INSERT INTO registro_saude (servico_identificador, estado, latencia_ms) VALUES (%s, %s, %s)",
                [
                    (r["identificador"], r["estado"], r["latencia_ms"])
                    for r in resultados
                    if r["estado"] != "desativado"
                ],
            )
            cur.execute(
                "DELETE FROM registro_saude WHERE verificado_em < (UTC_TIMESTAMP() - INTERVAL %s DAY)",
                (configuracoes.dias_registro_saude,),
            )
    except Exception:
        log.exception("falha ao gravar registro_saude")
    return resultados


# ---------- favoritos ----------
class FavoritoEntrada(BaseModel):
    titulo: str = Field(min_length=1, max_length=200)
    url: str = Field(min_length=1, max_length=2048)
    categoria: str | None = Field(default=None, max_length=80)

    @field_validator("titulo")
    @classmethod
    def _titulo(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("título vazio")
        return v

    @field_validator("url")
    @classmethod
    def _url(cls, v: str) -> str:
        v = v.strip()
        ok = (v.startswith("/") and not v.startswith("//")) or v.startswith(("http://", "https://"))
        if not ok:
            raise ValueError("url deve começar com '/', 'http://' ou 'https://'")
        return v


class Favorito(FavoritoEntrada):
    id: int
    criado_em: str
    atualizado_em: str


def _favorito(linha: dict) -> Favorito:
    return Favorito(
        id=linha["id"],
        titulo=linha["titulo"],
        url=linha["url"],
        categoria=linha["categoria"],
        criado_em=_iso(linha["criado_em"]),
        atualizado_em=_iso(linha["atualizado_em"]),
    )


def _buscar_favorito(favorito_id: int) -> dict:
    with cursor() as cur:
        cur.execute("SELECT * FROM favoritos WHERE id = %s", (favorito_id,))
        linha = cur.fetchone()
    if not linha:
        raise HTTPException(404, "Favorito não encontrado")
    return linha


@app.get("/api/favoritos", response_model=list[Favorito], tags=["favoritos"])
def listar_favoritos():
    with cursor() as cur:
        cur.execute("SELECT * FROM favoritos ORDER BY criado_em DESC, id DESC")
        return [_favorito(r) for r in cur.fetchall()]


@app.post("/api/favoritos", response_model=Favorito, status_code=201, tags=["favoritos"])
def criar_favorito(corpo: FavoritoEntrada):
    with cursor() as cur:
        cur.execute(
            "INSERT INTO favoritos (titulo, url, categoria) VALUES (%s, %s, %s)",
            (corpo.titulo, corpo.url, corpo.categoria),
        )
        favorito_id = cur.lastrowid
    return _favorito(_buscar_favorito(favorito_id))


@app.get("/api/favoritos/{favorito_id}", response_model=Favorito, tags=["favoritos"])
def obter_favorito(favorito_id: int):
    return _favorito(_buscar_favorito(favorito_id))


@app.put("/api/favoritos/{favorito_id}", response_model=Favorito, tags=["favoritos"])
def atualizar_favorito(favorito_id: int, corpo: FavoritoEntrada):
    _buscar_favorito(favorito_id)
    with cursor() as cur:
        cur.execute(
            "UPDATE favoritos SET titulo = %s, url = %s, categoria = %s WHERE id = %s",
            (corpo.titulo, corpo.url, corpo.categoria, favorito_id),
        )
    return _favorito(_buscar_favorito(favorito_id))


@app.delete("/api/favoritos/{favorito_id}", status_code=204, tags=["favoritos"])
def apagar_favorito(favorito_id: int):
    _buscar_favorito(favorito_id)
    with cursor() as cur:
        cur.execute("DELETE FROM favoritos WHERE id = %s", (favorito_id,))
    return Response(status_code=204)


# ---------- biblioteca ----------
class ItemBiblioteca(BaseModel):
    tipo: Literal["zim", "pmtiles", "modelo"]
    nome: str
    tamanho_bytes: int
    modificado_em: str


class Biblioteca(BaseModel):
    itens: list[ItemBiblioteca]
    total_bytes: int
    varrido_em: str


def _sincronizar_itens_conteudo(itens: list[dict]) -> None:
    with cursor() as cur:
        for it in itens:
            cur.execute(
                "INSERT INTO itens_conteudo (tipo, nome, tamanho_bytes, modificado_em) VALUES (%s, %s, %s, %s) "
                "ON DUPLICATE KEY UPDATE tamanho_bytes = VALUES(tamanho_bytes), modificado_em = VALUES(modificado_em)",
                (it["tipo"], it["nome"], it["tamanho_bytes"], it["modificado_em"]),
            )
        manter = {(it["tipo"], it["nome"]) for it in itens}
        cur.execute("SELECT id, tipo, nome FROM itens_conteudo")
        obsoletos = [r["id"] for r in cur.fetchall() if (r["tipo"], r["nome"]) not in manter]
        if obsoletos:
            cur.execute(
                "DELETE FROM itens_conteudo WHERE id IN (%s)" % ",".join(["%s"] * len(obsoletos)),
                obsoletos,
            )


@app.get("/api/biblioteca", response_model=Biblioteca, tags=["biblioteca"])
def biblioteca():
    """Inventário lido dos volumes (somente leitura); o espelho em itens_conteudo é melhor-esforço."""
    itens = varrer_biblioteca()
    try:
        _sincronizar_itens_conteudo(itens)
    except pymysql.MySQLError:
        log.exception("falha ao sincronizar itens_conteudo")
    return Biblioteca(
        itens=[ItemBiblioteca(**{**it, "modificado_em": _iso(it["modificado_em"])}) for it in itens],
        total_bytes=sum(it["tamanho_bytes"] for it in itens),
        varrido_em=_iso(datetime.now(timezone.utc).replace(tzinfo=None)),
    )


# ---------- frontend estático ----------
app.mount("/", StaticFiles(directory=BASE / "static/site", html=True), name="site")
