-- Spec 012: os perfis do Compose passam a ter nomes em português (translate, learn, media).
UPDATE servicos SET perfil = 'traducao' WHERE perfil = 'translate';
UPDATE servicos SET perfil = 'cursos' WHERE perfil = 'learn';
UPDATE servicos SET perfil = 'midia' WHERE perfil = 'media'
