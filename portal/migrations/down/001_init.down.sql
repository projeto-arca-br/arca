-- Migração reversa da 001 (manual; o runner nunca a aplica sozinho).
-- Uso: docker compose exec -T mariadb sh -c 'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" arca' < portal/migrations/down/001_init.down.sql
DROP TABLE IF EXISTS health_log;
DROP TABLE IF EXISTS content_items;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS bookmarks;
DROP TABLE IF EXISTS services;
DELETE FROM schema_migrations WHERE version = '001';
