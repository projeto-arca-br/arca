-- Spec 021: os cartões "Wikipédia" e "Notas" abrem as páginas do portal (/wikipedia/ e /anotacoes/); Kiwix (/wiki/) e FlatNotes (/notas/) seguem como telas nativas e como verificação de estado (url_verificacao não muda).
UPDATE servicos SET caminho = '/wikipedia/' WHERE identificador = 'wiki';
UPDATE servicos SET caminho = '/anotacoes/' WHERE identificador = 'notas'
