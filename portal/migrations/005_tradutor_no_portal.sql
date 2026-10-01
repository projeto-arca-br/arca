-- Spec 017: o cartão "Tradução" abre a página do portal (/tradutor/); a API do LibreTranslate segue em /traducao/ e continua sendo a verificação de estado.
UPDATE servicos SET caminho = '/tradutor/' WHERE identificador = 'traducao'
