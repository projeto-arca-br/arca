-- Spec 010: traduz tabelas, colunas e índices para português, preservando os dados.
-- Reversa manual em down/003_traducao_para_portugues.down.sql.

RENAME TABLE services TO servicos,
             bookmarks TO favoritos,
             settings TO configuracoes,
             content_items TO itens_conteudo,
             health_log TO registro_saude;

ALTER TABLE servicos
  CHANGE COLUMN slug identificador VARCHAR(40) NOT NULL,
  CHANGE COLUMN name nome VARCHAR(80) NOT NULL,
  CHANGE COLUMN description descricao VARCHAR(255) NOT NULL DEFAULT '',
  CHANGE COLUMN path caminho VARCHAR(120) NOT NULL,
  CHANGE COLUMN check_url url_verificacao VARCHAR(255) NOT NULL,
  CHANGE COLUMN profile perfil VARCHAR(40) NULL,
  CHANGE COLUMN position posicao INT NOT NULL DEFAULT 0,
  RENAME INDEX uq_services_slug TO uq_servicos_identificador;

ALTER TABLE favoritos
  CHANGE COLUMN title titulo VARCHAR(200) NOT NULL,
  CHANGE COLUMN category categoria VARCHAR(80) NULL,
  CHANGE COLUMN created_at criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHANGE COLUMN updated_at atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE configuracoes
  CHANGE COLUMN `key` chave VARCHAR(80) NOT NULL,
  CHANGE COLUMN `value` valor TEXT NOT NULL,
  CHANGE COLUMN updated_at atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE itens_conteudo
  CHANGE COLUMN kind tipo VARCHAR(20) NOT NULL,
  CHANGE COLUMN name nome VARCHAR(255) NOT NULL,
  CHANGE COLUMN size_bytes tamanho_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
  CHANGE COLUMN modified_at modificado_em DATETIME NOT NULL,
  CHANGE COLUMN updated_at atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  RENAME INDEX uq_content_kind_name TO uq_itens_tipo_nome;

ALTER TABLE registro_saude
  CHANGE COLUMN service_slug servico_identificador VARCHAR(40) NOT NULL,
  CHANGE COLUMN status estado VARCHAR(20) NOT NULL,
  CHANGE COLUMN latency_ms latencia_ms INT NULL,
  CHANGE COLUMN checked_at verificado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  RENAME INDEX idx_health_service_time TO idx_saude_servico_tempo;

-- Dados: a verificação do mapa aponta para a rota de saúde nova; o tipo "model" vira "modelo".
UPDATE servicos SET url_verificacao = 'http://127.0.0.1:8000/api/saude' WHERE identificador = 'mapas';
UPDATE itens_conteudo SET tipo = 'modelo' WHERE tipo = 'model'
