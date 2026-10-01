-- Reversa manual da 005: o cartão "Tradução" volta a abrir /traducao/ (exige LT_DISABLE_WEB_UI=false no compose para a interface do LibreTranslate existir).
-- Uso: docker compose exec -T mariadb sh -c 'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" arca' < portal/migrations/down/005_tradutor_no_portal.down.sql
-- Depois, remova a versão: DELETE FROM migracoes_aplicadas WHERE versao = '005'.

UPDATE servicos SET caminho = '/traducao/' WHERE identificador = 'traducao';
DELETE FROM migracoes_aplicadas WHERE versao = '005'
