-- Reversa manual da 006: os cartões "Wikipédia" e "Notas" voltam a abrir as telas nativas (/wiki/ e /notas/).
-- Uso: docker compose exec -T mariadb sh -c 'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" arca' < portal/migrations/down/006_wikipedia_e_notas_no_portal.down.sql
-- Depois, remova a versão: DELETE FROM migracoes_aplicadas WHERE versao = '006'.

UPDATE servicos SET caminho = '/wiki/' WHERE identificador = 'wiki';
UPDATE servicos SET caminho = '/notas/' WHERE identificador = 'notas';
DELETE FROM migracoes_aplicadas WHERE versao = '006'
