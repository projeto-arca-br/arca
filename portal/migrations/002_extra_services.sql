-- Spec 006: ajusta o catálogo dos serviços opcionais (perfis translate, learn, media).
-- Os checks usam o prefixo (base URL) de cada serviço.
UPDATE services SET check_url = 'http://libretranslate:5000/traducao/languages', profile = 'translate' WHERE slug = 'traducao';
UPDATE services SET check_url = 'http://kolibri:8080/cursos/api/public/info/', profile = 'learn' WHERE slug = 'cursos';
UPDATE services SET check_url = 'http://kavita:5000/livros/api/health', profile = 'media' WHERE slug = 'livros';
UPDATE services SET check_url = 'http://jellyfin:8096/midia/health', profile = 'media' WHERE slug = 'midia'
