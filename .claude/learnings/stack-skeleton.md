# Stack skeleton (spec 001)

- Imagens fixadas por tag@digest em `.env` (`ARCA_IMAGEM_MARIADB`, `ARCA_IMAGEM_CADDY`); mariadb 11.4.5 = série LTS. Novos serviços: adicionar `ARCA_IMAGEM_*` ao `.env.example`.
- Caddy escuta `:80` dentro do container; `admin off`; healthcheck via `wget` em `/healthz`. Rotas por caminho são placeholders 503 (`handle /x*`) a serem trocados por `reverse_proxy`.
- Porta publicada: `${ARCA_ENDERECO}:${ARCA_PORTA}:80`. `make subir` cria `.env` com o IP da LAN detectado (`ip route get`); padrão seguro 127.0.0.1.
- MariaDB: healthcheck nativo `healthcheck.sh --connect --innodb_initialized`; dados em `data/mariadb`.
- `make subir` usa `docker compose up -d --wait`. Porta 80 pode estar ocupada na máquina de dev: `ARCA_PORTA=8088 make subir`.
