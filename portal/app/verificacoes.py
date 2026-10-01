import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

from .configuracao import configuracoes


def verificar_url(url: str, tempo_limite: float | None = None) -> tuple[str, int | None]:
    """Retorna ('online'|'offline', latência em ms). Nunca lança exceção."""
    tempo_limite = configuracoes.tempo_limite_verificacao if tempo_limite is None else tempo_limite
    inicio = time.monotonic()
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "arca-portal"})
        with urllib.request.urlopen(req, timeout=tempo_limite):
            pass
        ok = True
    except urllib.error.HTTPError as exc:
        ok = exc.code < 500  # respondeu: o serviço está no ar (ex.: 401/404)
    except Exception:
        return "offline", None
    ms = int((time.monotonic() - inicio) * 1000)
    return ("online" if ok else "offline"), (ms if ok else None)


def verificar_todos(linhas: list[dict]) -> list[dict]:
    """Verifica os serviços em paralelo; os de perfis desligados ficam 'desativado'."""
    resultados: dict[str, tuple[str, int | None]] = {}
    a_verificar = [
        r for r in linhas if not r["perfil"] or r["perfil"] in configuracoes.perfis_ativos
    ]
    for r in linhas:
        if r not in a_verificar:
            resultados[r["identificador"]] = ("desativado", None)
    if a_verificar:
        with ThreadPoolExecutor(max_workers=min(len(a_verificar), 16)) as pool:
            futuros = {
                r["identificador"]: pool.submit(verificar_url, r["url_verificacao"]) for r in a_verificar
            }
            for identificador, futuro in futuros.items():
                try:
                    resultados[identificador] = futuro.result(
                        timeout=configuracoes.tempo_limite_verificacao + 2
                    )
                except Exception:
                    resultados[identificador] = ("offline", None)
    return [
        {
            "identificador": r["identificador"],
            "nome": r["nome"],
            "descricao": r["descricao"],
            "caminho": r["caminho"],
            "perfil": r["perfil"],
            "estado": resultados[r["identificador"]][0],
            "latencia_ms": resultados[r["identificador"]][1],
        }
        for r in linhas
    ]
