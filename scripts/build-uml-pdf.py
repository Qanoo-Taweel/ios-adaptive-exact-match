"""Builds docs/uml/UML-diagrams.pdf: cover + one A4 page per UML diagram (dev tool, not needed for npm test).

    node scripts/render-uml.mjs <mermaid.min.js>   # first, refreshes docs/uml/*.svg
    python3 scripts/build-uml-pdf.py [--chrome google-chrome]

Each page is printed portrait or landscape, whichever makes the text bigger.
"""
import argparse
import html
import re
import subprocess
import tempfile
from pathlib import Path

UML = Path(__file__).resolve().parent.parent / "docs" / "uml"
OUT = UML / "UML-diagrams.pdf"
AUTHORS = "Qunoo A K Taweel (23291712) · Zeynep Arıcan (24290319)"
PAGES = [  # (file, page title)
    ("06-hand-drawable", "Özet sınıf diyagramı (9 kutu, temel metotlar)"),
    ("01-overview", "Mimari: IoS katmanları"),
    ("02-atoms", "Atomlar: Template Method + Strategy"),
    ("03-molecule", "ExactMatch molekülü: Chain of Responsibility, Factory Method, Registry, Builder"),
    ("04-cli", "Komut satırı: Facade + Command + Factory Method"),
    ("05-sequence-explain", "Sıra diyagramı: bin/ios.js explain"),
    ("00-full", "Tam sınıf diyagramı (bütün sınıflar; ayrıntılar önceki sayfalarda)"),
]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--chrome", default="google-chrome")
    a = ap.parse_args()
    secs = []
    for i, (name, title) in enumerate(PAGES, 1):
        svg = (UML / (name + ".svg")).read_text()
        svg = re.sub(r"<\?xml[^>]*>", "", svg)
        w, h = map(float, re.search(r'viewBox="[-\d.]+ [-\d.]+ ([\d.]+) ([\d.]+)"', svg).groups())
        portrait = min(194 / w, 262 / h) > min(281 / w, 178 / h)
        secs.append('<section class="%s"><header><b>%s</b></header><div class="d">%s</div>'
                    '<footer><span>ExactMatch · UML diyagramları</span><span>%s · sayfa %d / %d</span></footer></section>'
                    % ("port" if portrait else "land", html.escape(title), svg, html.escape(AUTHORS), i, len(PAGES)))
    cover = ('<section class="cover"><div><p class="k">IoS · sequence.pattern-match.exact</p>'
             '<h1>ExactMatch — UML diyagramları</h1><p>YZM327 Vize projesi (Ödev 3) · Kasım 2026</p>'
             '<p class="who">Qunoo A K Taweel — 23291712<br>Zeynep Arıcan — 24290319</p>'
             '<p class="src">Kod: github.com/Qanoo-Taweel/ios-adaptive-exact-match · kaynak: docs/uml/*.mmd</p></div></section>')
    doc = """<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>
@page{size:A4 landscape;margin:8mm} @page port{size:A4 portrait;margin:8mm}
body{margin:0;font-family:Helvetica,Arial,sans-serif;color:#111}
section{width:281mm;height:193mm;display:flex;flex-direction:column;page-break-after:always;overflow:hidden}
section.port{page:port;width:194mm;height:280mm}
header{font-size:14px;padding-bottom:3px;border-bottom:1px solid #ccc}
footer{display:flex;justify-content:space-between;font-size:9px;color:#555;border-top:1px solid #ccc;padding-top:2px}
.d{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:3mm 0}
.d svg{width:100%%!important;height:100%%!important;max-width:none!important}
.cover{align-items:center;justify-content:center;text-align:center}
.cover h1{font-size:30px;margin:0 0 6px}.cover p{font-size:15px;margin:4px}.cover .k{color:#1c5cab;font-size:12px;letter-spacing:.08em}
.cover .who{font-size:18px;margin-top:28px;line-height:1.6}.cover .src{font-size:11px;color:#555;margin-top:30px}
</style></head><body>%s%s</body></html>""" % (cover, "".join(secs))
    with tempfile.TemporaryDirectory() as t:
        page = Path(t) / "uml.html"
        page.write_text(doc)
        subprocess.run([a.chrome, "--headless=new", "--no-sandbox", "--disable-gpu", "--no-pdf-header-footer",
                        "--print-to-pdf=%s" % OUT, page.as_uri()], check=True, capture_output=True)
    print("wrote", OUT, "(%d pages)" % (len(PAGES) + 1))


if __name__ == "__main__":
    main()
