-- Reversa manual da 003: volta aos nomes em inglês, preservando os dados.
-- Uso: docker compose exec -T mariadb sh -c 'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" arca' < portal/migrations/down/003_traducao_para_portugues.down.sql
-- Depois desta reversa, o código anterior ao da spec 010 volta a funcionar.

UPDATE itens_conteudo SET tipo = 'model' WHERE tipo = 'modelo';
UPDATE servicos SET url_verificacao = 'http://127.0.0.1:8000/api/health' WHERE identificador = 'mapas';

ALTER TABLE registro_saude
  CHANGE COLUMN servico_identificador service_slug VARCHAR(40) NOT NULL,
  CHANGE COLUMN estado status VARCHAR(20) NOT NULL,
  CHANGE COLUMN latencia_ms latency_ms INT NULL,
  CHANGE COLUMN verificado_em checked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  RENAME INDEX idx_saude_servico_tempo TO idx_health_service_time;

ALTER TABLE itens_conteudo
  CHANGE COLUMN tipo kind VARCHAR(20) NOT NULL,
  CHANGE COLUMN nome name VARCHAR(255) NOT NULL,
  CHANGE COLUMN tamanho_bytes size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
  CHANGE COLUMN modificado_em modified_at DATETIME NOT NULL,
  CHANGE COLUMN atualizado_em updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  RENAME INDEX uq_itens_tipo_nome TO uq_content_kind_name;

ALTER TABLE configuracoes
  CHANGE COLUMN chave `key` VARCHAR(80) NOT NULL,
  CHANGE COLUMN valor `value` TEXT NOT NULL,
  CHANGE COLUMN atualizado_em updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE favoritos
  CHANGE COLUMN titulo title VARCHAR(200) NOT NULL,
  CHANGE COLUMN categoria category VARCHAR(80) NULL,
  CHANGE COLUMN criado_em created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHANGE COLUMN atualizado_em updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE servicos
  CHANGE COLUMN identificador slug VARCHAR(40) NOT NULL,
  CHANGE COLUMN nome name VARCHAR(80) NOT NULL,
  CHANGE COLUMN descricao description VARCHAR(255) NOT NULL DEFAULT '',
  CHANGE COLUMN caminho path VARCHAR(120) NOT NULL,
  CHANGE COLUMN url_verificacao check_url VARCHAR(255) NOT NULL,
  CHANGE COLUMN perfil profile VARCHAR(40) NULL,
  CHANGE COLUMN posicao position INT NOT NULL DEFAULT 0,
  RENAME INDEX uq_servicos_identificador TO uq_services_slug;

RENAME TABLE servicos TO services,
             favoritos TO bookmarks,
             configuracoes TO settings,
             itens_conteudo TO content_items,
             registro_saude TO health_log;

-- O histórico de migrações volta ao formato antigo (o código novo o renomeia de novo ao subir).
DELETE FROM migracoes_aplicadas WHERE versao = '003';
ALTER TABLE migracoes_aplicadas
  CHANGE COLUMN versao version VARCHAR(20) NOT NULL,
  CHANGE COLUMN arquivo filename VARCHAR(255) NOT NULL,
  CHANGE COLUMN aplicada_em applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
RENAME TABLE migracoes_aplicadas TO schema_migrations
