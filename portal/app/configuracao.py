import os
from dataclasses import dataclass, field
from pathlib import Path


def _perfis() -> frozenset[str]:
    bruto = os.environ.get("ARCA_PERFIS_ATIVOS", "")
    return frozenset(p.strip() for p in bruto.split(",") if p.strip())


@dataclass
class Configuracoes:
    # Os nomes das variáveis de ambiente (`ARCA_*`) são os definidos no docker-compose.
    bd_host: str = field(default_factory=lambda: os.environ.get("ARCA_BD_HOST", "mariadb"))
    bd_porta: int = field(default_factory=lambda: int(os.environ.get("ARCA_BD_PORTA", "3306")))
    bd_nome: str = field(default_factory=lambda: os.environ.get("ARCA_BD_NOME", "arca"))
    bd_usuario: str = field(default_factory=lambda: os.environ.get("ARCA_BD_USUARIO", "arca"))
    bd_senha: str = field(default_factory=lambda: os.environ.get("ARCA_BD_SENHA", ""))
    bd_espera_segundos: int = field(default_factory=lambda: int(os.environ.get("ARCA_BD_ESPERA_SEGUNDOS", "90")))
    diretorio_migracoes: Path = field(
        default_factory=lambda: Path(os.environ.get("ARCA_DIRETORIO_MIGRACOES", "/app/migrations"))
    )
    diretorio_zim: Path = field(default_factory=lambda: Path(os.environ.get("ARCA_DIRETORIO_ZIM", "/biblioteca/zim")))
    diretorio_mapas: Path = field(default_factory=lambda: Path(os.environ.get("ARCA_DIRETORIO_MAPAS", "/biblioteca/mapas")))
    diretorio_modelos: Path = field(default_factory=lambda: Path(os.environ.get("ARCA_DIRETORIO_MODELOS", "/biblioteca/modelos")))
    perfis_ativos: frozenset[str] = field(default_factory=_perfis)
    tempo_limite_verificacao: float = field(default_factory=lambda: float(os.environ.get("ARCA_TEMPO_LIMITE_VERIFICACAO", "1.5")))
    dias_registro_saude: int = 7


configuracoes = Configuracoes()
