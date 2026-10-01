from datetime import datetime, timezone
from pathlib import Path

from .configuracao import configuracoes

EXTENSAO_PMTILES = ".pmtiles"


def _tamanho(caminho: Path) -> int:
    if caminho.is_file():
        return caminho.stat().st_size
    return sum(f.stat().st_size for f in caminho.rglob("*") if f.is_file())


def _varrer(tipo: str, diretorio: Path, sufixo: str | None) -> list[dict]:
    itens: list[dict] = []
    if not diretorio.is_dir():
        return itens
    for entrada in sorted(diretorio.iterdir()):
        if entrada.name.startswith("."):
            continue
        if sufixo and not (entrada.is_file() and entrada.name.lower().endswith(sufixo)):
            continue
        try:
            st = entrada.stat()
            itens.append(
                {
                    "tipo": tipo,
                    "nome": entrada.name,
                    "tamanho_bytes": _tamanho(entrada),
                    "modificado_em": datetime.fromtimestamp(st.st_mtime, timezone.utc).replace(tzinfo=None),
                }
            )
        except OSError:
            continue  # arquivo sumiu durante a varredura
    return itens


def varrer_biblioteca() -> list[dict]:
    return (
        _varrer("zim", configuracoes.diretorio_zim, ".zim")
        + _varrer("pmtiles", configuracoes.diretorio_mapas, EXTENSAO_PMTILES)
        + _varrer("modelo", configuracoes.diretorio_modelos, None)
    )
