import re

file = r"c:\Users\Arthu\OneDrive\Área de Trabalho\G.Form\G.Form 2.0\G.Form\src\pages\AdminPanel.tsx"

with open(file, "r", encoding="utf-8") as f:
    content = f.read()

replacements = [
    # em-dash mojibake
    ("'â\u20acâ€\"'", "'—'"),
    # middle dot mojibake
    ("' Â· '", "' · '"),
    # Portuguese words
    ("IncluÃ­do", "Incluído"),
    ("EndereÃ§o", "Endereço"),
    ("HistÃ³rico", "Histórico"),
    ("PrevisÃ£o", "Previsão"),
    ("Ã"mega", "Ômega"),
    ("â†'", "→"),
    # box drawing comment chars
    ("â\u201câ€"â€"", "──"),
    ("â\u201câ"€â"€", "──"),
]

for old, new in replacements:
    if old in content:
        count = content.count(old)
        content = content.replace(old, new)
        print(f"Replaced {count}x: {repr(old)} -> {repr(new)}")
    else:
        print(f"NOT FOUND: {repr(old)}")

with open(file, "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
