#!/usr/bin/env python3
"""Build Trestle brief exports.

Inputs (HTML in this directory):
  - trestle-brief-executive.html   -> trestle-brief-executive.docx (V1, no jargon)
  - trestle-brief-technical.html   -> trestle-brief-technical.docx (V2, technical depth)
  - trestle-brief-infographic.html -> trestle-brief-infographic.pdf (dense visual summary of V1)

soffice was unavailable in this env, so DOCX is built natively via python-docx and
PDF via WeasyPrint (which renders the HTML faithfully, including dark theme and
custom layout).
"""
from pathlib import Path
import re
from bs4 import BeautifulSoup, NavigableString
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from weasyprint import HTML

HERE = Path(__file__).parent

EXEC_HTML = HERE / "trestle-brief-executive.html"
TECH_HTML = HERE / "trestle-brief-technical.html"
INFO_HTML = HERE / "trestle-brief-infographic.html"

EXEC_DOCX = HERE / "trestle-brief-executive.docx"
TECH_DOCX = HERE / "trestle-brief-technical.docx"
INFO_PDF = HERE / "trestle-brief-infographic.pdf"


# ---------- helpers ----------

BLUE = RGBColor(0x2C, 0x5A, 0x8A)
AMBER = RGBColor(0xB0, 0x7B, 0x3A)
GREY = RGBColor(0x6A, 0x73, 0x7C)
DARK = RGBColor(0x1A, 0x1F, 0x25)
GREEN = RGBColor(0x2F, 0x6B, 0x50)


def _inline_text(node) -> str:
    if node is None:
        return ""
    return re.sub(r"\s+", " ", node.get_text(" ", strip=True))


def _style_runs(p, size_pt=None, color=None, bold=None):
    for run in p.runs:
        if size_pt is not None:
            run.font.size = Pt(size_pt)
        if color is not None:
            run.font.color.rgb = color
        if bold is not None:
            run.font.bold = bold


def _add_paragraph(doc, text, *, size_pt=11, color=None, bold=False, style=None):
    p = doc.add_paragraph(text, style=style) if style else doc.add_paragraph(text)
    _style_runs(p, size_pt=size_pt, color=color, bold=bold)
    return p


# ---------- DOCX builder ----------

def _render_card(doc, card):
    for el in card.children:
        if isinstance(el, NavigableString):
            continue
        name = el.name
        cls = el.get("class") or []
        if name == "h3":
            _add_paragraph(doc, _inline_text(el), size_pt=12, color=AMBER, bold=True)
        elif name == "h4":
            _add_paragraph(
                doc, _inline_text(el).upper(), size_pt=10, color=DARK, bold=True
            )
        elif name == "p":
            text = _inline_text(el)
            if text:
                muted = "muted" in cls or "fn" in cls
                _add_paragraph(
                    doc,
                    text,
                    size_pt=10 if muted else 11,
                    color=GREY if muted else None,
                )
        elif name == "ul":
            for li in el.find_all("li", recursive=False):
                _add_paragraph(doc, _inline_text(li), style="List Bullet")
        elif name == "table":
            _render_table(doc, el)
        elif name == "div" and "kv" in cls:
            _render_kv(doc, el)
        elif name == "div" and "gauges" in cls:
            _render_gauges(doc, el)
        elif name == "div" and ("card" in cls or "grid2" in cls):
            _render_card(doc, el)
        elif name == "hr":
            _add_paragraph(doc, "")


def _render_table(doc, el):
    rows = el.find_all("tr")
    if not rows:
        return
    cols = max(len(r.find_all(["td", "th"])) for r in rows)
    table = doc.add_table(rows=0, cols=cols)
    table.style = "Light Grid Accent 1"
    for r in rows:
        cells = r.find_all(["th", "td"])
        out_row = table.add_row().cells
        for i, c in enumerate(cells):
            if i < cols:
                out_row[i].text = _inline_text(c)


def _render_kv(doc, kv):
    items = []
    children = [c for c in kv.children if not isinstance(c, NavigableString)]
    i = 0
    while i < len(children) - 1:
        k, v = children[i], children[i + 1]
        if "k" in (k.get("class") or []):
            items.append((_inline_text(k), _inline_text(v)))
            i += 2
        else:
            i += 1
    if not items:
        return
    table = doc.add_table(rows=0, cols=2)
    table.autofit = False
    for k, v in items:
        row = table.add_row().cells
        row[0].text = k.upper()
        row[1].text = v
        row[0].width = Inches(1.2)
        for p in row[0].paragraphs:
            _style_runs(p, size_pt=8.5, color=GREY, bold=True)


def _render_gauges(doc, gauges):
    for row in gauges.find_all("div", class_="gauge-row"):
        label = row.find("span", class_="gauge-label")
        rest = []
        for span in row.find_all("span"):
            if span is label:
                continue
            t = _inline_text(span)
            if t:
                rest.append(t)
        if not label:
            continue
        line = f"{_inline_text(label)}: {' '.join(rest)}"
        _add_paragraph(doc, line, size_pt=10, color=GREY)


def build_docx(soup: BeautifulSoup, out: Path):
    doc = Document()
    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    style.font.size = Pt(11)

    # Word "Narrow" margin preset
    for section in doc.sections:
        section.top_margin = Inches(0.5)
        section.bottom_margin = Inches(0.5)
        section.left_margin = Inches(0.5)
        section.right_margin = Inches(0.5)

    body = soup.body
    for el in body.children:
        if isinstance(el, NavigableString):
            continue
        name = el.name
        cls = el.get("class") or []
        if name == "h1":
            _add_paragraph(doc, _inline_text(el), size_pt=22, color=DARK, bold=True)
        elif name == "h2":
            doc.add_paragraph()
            _add_paragraph(doc, _inline_text(el).upper(), size_pt=14, color=BLUE, bold=True)
        elif name == "h3":
            _add_paragraph(doc, _inline_text(el), size_pt=12, color=AMBER, bold=True)
        elif name == "h4":
            _add_paragraph(doc, _inline_text(el).upper(), size_pt=10, color=DARK, bold=True)
        elif name == "p":
            text = _inline_text(el)
            if text:
                muted = "subtitle" in cls or "muted" in cls or "fn" in cls
                _add_paragraph(
                    doc,
                    text,
                    size_pt=10 if muted else 11,
                    color=GREY if muted else None,
                )
        elif name == "ul":
            for li in el.find_all("li", recursive=False):
                _add_paragraph(doc, _inline_text(li), style="List Bullet")
        elif name == "table":
            _render_table(doc, el)
        elif name == "div":
            if "page-break" in cls:
                doc.add_page_break()
            elif "card" in cls or "grid2" in cls:
                _render_card(doc, el)
            else:
                _render_card(doc, el)
        elif name == "hr":
            _add_paragraph(doc, "")

    doc.save(str(out))


# ---------- PDF builder (WeasyPrint renders HTML directly) ----------

def build_pdf(src: Path, out: Path):
    HTML(filename=str(src)).write_pdf(str(out))


def main():
    print("Building executive DOCX...")
    build_docx(BeautifulSoup(EXEC_HTML.read_text(), "html.parser"), EXEC_DOCX)
    print(f"  -> {EXEC_DOCX}")

    print("Building technical DOCX...")
    build_docx(BeautifulSoup(TECH_HTML.read_text(), "html.parser"), TECH_DOCX)
    print(f"  -> {TECH_DOCX}")

    print("Building infographic PDF...")
    build_pdf(INFO_HTML, INFO_PDF)
    print(f"  -> {INFO_PDF}")


if __name__ == "__main__":
    main()
