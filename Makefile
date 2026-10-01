.PHONY: subir derrubar estado logs ambiente teste teste-portal teste-operacao teste-fumaca teste-convencao modelos-traducao diretorios-extras baixar-dados empacotar carregar backup restaurar

# Cria .env a partir do exemplo, usando o IP da LAN detectado como endereço de escuta.
ambiente:
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		ip=$$(ip -4 route get 1.1.1.1 2>/dev/null | sed -n 's/.* src \([0-9.]*\).*/\1/p' | head -1); \
		if [ -n "$$ip" ]; then sed -i "s/^ARCA_ENDERECO=.*/ARCA_ENDERECO=$$ip/" .env; echo "ARCA_ENDERECO=$$ip"; fi; \
		sed -i "s/^ARCA_UID=.*/ARCA_UID=$$(id -u)/; s/^ARCA_GID=.*/ARCA_GID=$$(id -g)/" .env; \
		echo ".env criado - troque as senhas do MariaDB."; \
	fi

# OPCOES_SUBIR: o carregar.sh usa '--no-build --pull never' (instalação offline).
OPCOES_SUBIR ?= --build
subir: ambiente
	@mkdir -p data/mariadb data/flatnotes data/zim data/maps data/models
	@$(MAKE) --no-print-directory diretorios-extras
	docker compose up -d $(OPCOES_SUBIR) --wait

# Pastas dos perfis opcionais (criadas sempre; vazias não custam nada).
# Jellyfin lê BaseUrl=/midia de config/network.xml e Kavita BaseUrl=/livros/ de
# appsettings.json (sementes em jellyfin/ e kavita/; só copiadas se ainda não existirem).
diretorios-extras:
	@mkdir -p data/models/argos data/kolibri data/kavita data/books data/comics \
		data/media/movies data/media/music data/jellyfin/config data/jellyfin/cache
	@for f in network encoding; do \
		[ -f data/jellyfin/config/$$f.xml ] || cp jellyfin/$$f.xml data/jellyfin/config/$$f.xml; \
	done
	@[ -f data/kavita/appsettings.json ] || cp kavita/appsettings.json data/kavita/appsettings.json

# Baixa UMA vez (precisa de internet) os modelos Argos + MiniSBD de en/pt/es em
# data/models/argos; depois o LibreTranslate roda 100% offline. Idempotente.
# Usa --network host: em algumas redes (MTU/VPN) a bridge do Docker trava no TLS.
modelos-traducao: ambiente diretorios-extras
	@set -a; . ./.env; set +a; \
	docker run --rm --network host --user $$(id -u):$$(id -g) \
		-e HOME=/tmp -e XDG_DATA_HOME=/data \
		-v "$$PWD/data/models/argos:/data/argos-translate" \
		--entrypoint ./venv/bin/python "$$ARCA_IMAGEM_LIBRETRANSLATE" -u -c \
		"from libretranslate.init import boot; from minisbd import download_models; L=['en','pt','es']; boot(L); download_models(L, print)"

# Derruba tudo, inclusive serviços de perfis opcionais.
derrubar:
	docker compose --profile traducao --profile cursos --profile midia down --remove-orphans

estado:
	docker compose ps

logs:
	docker compose logs -f --tail=100

# Testes do portal contra um MariaDB real descartável (não toca o banco de desenvolvimento).
teste-portal:
	docker compose -f docker-compose.yml -f docker-compose.teste.yml run --rm --build portal pytest
	docker compose -f docker-compose.yml -f docker-compose.teste.yml rm -sf mariadb-teste

# ---- Scripts operacionais (spec 007) ----

# Baixa conteúdo (precisa de internet). PERFIL=mini|completo; ARGUMENTOS='--simular --somente zim,mapas'.
PERFIL ?= mini
baixar-dados:
	scripts/baixar-dados.sh $(PERFIL) $(ARGUMENTOS)

# Empacota imagens + dados para instalar offline: make empacotar DESTINO=/caminho [ARGUMENTOS='--perfis nenhum']
empacotar:
	@[ -n "$(DESTINO)" ] || { echo "[erro] informe DESTINO: make empacotar DESTINO=/caminho" >&2; exit 1; }
	scripts/empacotar.sh "$(DESTINO)" $(ARGUMENTOS)

# Instala a partir de um pacote: make carregar ORIGEM=/caminho [ARGUMENTOS='--destino DIR']
carregar:
	@[ -n "$(ORIGEM)" ] || { echo "[erro] informe ORIGEM: make carregar ORIGEM=/caminho" >&2; exit 1; }
	scripts/carregar.sh "$(ORIGEM)" $(ARGUMENTOS)

# Backup (dump do MariaDB + notas + estado + configs) em ./backups (ou DIRETORIO_BACKUP=...).
backup:
	scripts/backup.sh $(DIRETORIO_BACKUP)

# A restauração exige confirmação: make restaurar CONFIRMAR=1 [ARQUIVO=backups/arca-backup-....tar.gz]
restaurar:
	scripts/restaurar.sh $(if $(CONFIRMAR),--confirmar) $(ARQUIVO)

# Testes dos scripts operacionais: baixar dados (retomada/checksum) e backup->restaurar em cópia descartável.
teste-operacao:
	scripts/teste-operacao.sh

# Fumaça E2E da stack (spec 008) numa cópia descartável (projeto arca-fumaca, porta PORTA_FUMACA=8099),
# com a rede interna sem saída para a internet. Requer um .zim em data/zim.
teste-fumaca:
	scripts/fumaca.sh

# Convenção de idioma (termos do glossário em inglês, exceções em scripts/convencao-excecoes.txt)
# e links relativos do README.md e de docs/. Rápido e sem Docker.
teste-convencao:
	python3 scripts/teste-convencao.py

# Todos os testes automáticos: convenção + API do portal + scripts operacionais + fumaça da stack.
teste: teste-convencao teste-portal teste-operacao teste-fumaca
