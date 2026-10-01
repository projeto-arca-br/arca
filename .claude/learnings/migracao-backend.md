# Migração do backend para português

- Migração `003_traducao_para_portugues.sql` renomeia tabelas, colunas e índices; a reversa manual fica em `portal/migrations/down/`.
- O histórico `schema_migrations` virou `migracoes_aplicadas` (colunas `versao`, `arquivo`, `aplicada_em`); `banco.py` renomeia a tabela antiga antes de migrar, e a reversa da 003 a devolve ao formato antigo.
- Testes: `testes/teste_*.py` (pytest configurado com `python_files`/`python_functions` em `pyproject.toml`). O teste de reversa reverte a 003 no próprio banco de teste e reaplica, pois o usuário de teste não pode criar outro banco.
- Variáveis de ambiente e perfis foram renomeados depois, na spec 012 (ver `migracao-operacao.md`).
