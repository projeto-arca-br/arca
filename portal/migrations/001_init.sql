-- Arca portal: esquema inicial (spec 003)

CREATE TABLE IF NOT EXISTS services (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(40) NOT NULL,
  name VARCHAR(80) NOT NULL,
  description VARCHAR(255) NOT NULL DEFAULT '',
  path VARCHAR(120) NOT NULL,
  check_url VARCHAR(255) NOT NULL,
  profile VARCHAR(40) NULL,
  position INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_services_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bookmarks (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  url VARCHAR(2048) NOT NULL,
  category VARCHAR(80) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS settings (
  `key` VARCHAR(80) NOT NULL PRIMARY KEY,
  `value` TEXT NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS content_items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  kind VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
  modified_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_content_kind_name (kind, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS health_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_slug VARCHAR(40) NOT NULL,
  status VARCHAR(20) NOT NULL,
  latency_ms INT NULL,
  checked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_health_service_time (service_slug, checked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO services (slug, name, description, path, check_url, profile, position) VALUES
  ('notas', 'Notas', 'Notas em markdown (FlatNotes)', '/notas/', 'http://flatnotes:8080/notas/health', NULL, 10),
  ('wiki', 'Wikipédia e livros', 'Conteúdo offline via Kiwix', '/wiki/', 'http://kiwix:8080/wiki/', NULL, 20),
  ('mapas', 'Mapas', 'Mapa offline (MapLibre + PMTiles)', '/mapas/', 'http://127.0.0.1:8000/api/health', NULL, 30),
  ('traducao', 'Tradução', 'Tradutor offline (LibreTranslate)', '/traducao/', 'http://libretranslate:5000/', 'translate', 40),
  ('cursos', 'Cursos', 'Cursos offline (Kolibri)', '/cursos/', 'http://kolibri:8080/', 'learn', 50),
  ('livros', 'Livros e quadrinhos', 'Biblioteca de leitura (Kavita)', '/livros/', 'http://kavita:5000/', 'media', 60),
  ('midia', 'Filmes e música', 'Mídia (Jellyfin)', '/midia/', 'http://jellyfin:8096/', 'media', 70);
