#!/usr/bin/env python3
"""Calcula razões de contraste WCAG 2.1 dos pares principais da paleta do Arca."""
import json, sys

PALETA = {
    "carvao": "#1C2421", "musgo": "#3F5A43", "folha": "#7FA363",
    "ferrugem": "#A8471F", "brasa": "#E8873F", "osso": "#EDE6D6",
    "argila": "#6E5540", "argila-clara": "#B89A7E",
    "superficie-clara": "#F6F1E6", "superficie-escura": "#232C28",
}

def lin(c):
    c /= 255
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

def lum(h):
    h = h.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)

def razao(a, b):
    x, y = sorted([lum(a), lum(b)], reverse=True)
    return (x + 0.05) / (y + 0.05)

# (tema, descrição, frente, fundo, mínimo)
PARES = [
    ("claro", "texto principal", "carvao", "osso", 4.5),
    ("claro", "texto principal em cartão", "carvao", "superficie-clara", 4.5),
    ("claro", "texto suave (argila)", "argila", "osso", 4.5),
    ("claro", "texto suave em cartão", "argila", "superficie-clara", 4.5),
    ("claro", "link/acento (ferrugem)", "ferrugem", "osso", 4.5),
    ("claro", "link em cartão", "ferrugem", "superficie-clara", 4.5),
    ("claro", "título (musgo)", "musgo", "osso", 4.5),
    ("claro", "botão: osso sobre ferrugem", "osso", "ferrugem", 4.5),
    ("claro", "cabeçalho: osso sobre musgo", "osso", "musgo", 4.5),
    ("claro", "brasa sobre carvão (faixa escura)", "brasa", "carvao", 4.5),
    ("escuro", "texto principal", "osso", "carvao", 4.5),
    ("escuro", "texto principal em cartão", "osso", "superficie-escura", 4.5),
    ("escuro", "texto suave (argila clara)", "argila-clara", "carvao", 4.5),
    ("escuro", "texto suave em cartão", "argila-clara", "superficie-escura", 4.5),
    ("escuro", "link/acento (brasa)", "brasa", "carvao", 4.5),
    ("escuro", "link em cartão", "brasa", "superficie-escura", 4.5),
    ("escuro", "título (folha)", "folha", "carvao", 4.5),
    ("escuro", "título em cartão (folha)", "folha", "superficie-escura", 4.5),
    ("escuro", "botão: carvão sobre brasa", "carvao", "brasa", 4.5),
    ("ambos", "símbolo: ferrugem (não texto)", "ferrugem", "osso", 3.0),
    ("ambos", "símbolo: folha sobre carvão (não texto)", "folha", "carvao", 3.0),
]

def tabela():
    saida = []
    for tema, desc, f, b, minimo in PARES:
        r = razao(PALETA[f], PALETA[b])
        saida.append(dict(tema=tema, descricao=desc, frente=f, fundo=b,
                          frente_hex=PALETA[f], fundo_hex=PALETA[b],
                          razao=round(r, 2), minimo=minimo, ok=r >= minimo))
    return saida

if __name__ == "__main__":
    t = tabela()
    if "--json" in sys.argv:
        print(json.dumps(t, ensure_ascii=False))
    else:
        for l in t:
            print(f"{l['tema']:7} {l['descricao']:42} {l['razao']:5.2f} (min {l['minimo']}) {'OK' if l['ok'] else 'FALHA'}")
    sys.exit(0 if all(l["ok"] for l in t) else 1)
