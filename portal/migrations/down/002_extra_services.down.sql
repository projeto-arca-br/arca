-- Reversa manual da 002: restaura os check_url do seed da 001.
UPDATE services SET check_url = 'http://libretranslate:5000/' WHERE slug = 'traducao';
UPDATE services SET check_url = 'http://kolibri:8080/' WHERE slug = 'cursos';
UPDATE services SET check_url = 'http://kavita:5000/' WHERE slug = 'livros';
UPDATE services SET check_url = 'http://jellyfin:8096/' WHERE slug = 'midia';
DELETE FROM schema_migrations WHERE version = '002';
