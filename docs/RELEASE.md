# Publicação

Checklist enxuto para publicar uma versão do Arca. Só lista comandos que já existem no projeto; os detalhes de cada
etapa estão em [OFFLINE.md](OFFLINE.md) e no [README da raiz](../README.md).

1. Rode a bateria completa e confirme que passa: `make teste` (convenção, portal, operação e fumaça).
2. Confira que as imagens do `.env.example` seguem fixadas por versão e digest (a fumaça já verifica).
3. Baixe os dados e os modelos em uma máquina com internet: `make baixar-dados` e, se for distribuir a tradução,
   `make modelos-traducao`.
4. Gere o pacote: `make empacotar DESTINO=/caminho/do/pendrive`.
5. Em uma máquina sem internet, instale pelo pacote (`make carregar` ou `./carregar.sh`) e confira o painel e os serviços.
6. Não inclua `data/` de uso real nem o `.env` com senhas: troque as senhas do MariaDB antes do primeiro start real.
