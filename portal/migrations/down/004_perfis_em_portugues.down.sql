-- Reversa manual da 004: volta aos nomes de perfil em inglês (exige o compose anterior à spec 012).
-- Uso: docker compose exec -T mariadb sh -c 'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" arca' < portal/migrations/down/004_perfis_em_portugues.down.sql
-- Depois, remova a versão: DELETE FROM migracoes_aplicadas WHERE versao = '004';

UPDATE servicos SET perfil = 'translate' WHERE perfil = 'traducao';
UPDATE servicos SET perfil = 'learn' WHERE perfil = 'cursos';
UPDATE servicos SET perfil = 'media' WHERE perfil = 'midia';
DELETE FROM migracoes_aplicadas WHERE versao = '004'
