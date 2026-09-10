from app.rag.engine import _rank_passages, _normalize_text

MANUAL = """
PDF Accessibility
Technique PDF1: Applying text alternatives to images with the Alt entry in PDF documents
This technique ensures that images include meaningful text alternatives using the Alt entry.

Technique PDF9: Providing headings by marking content with heading tags in PDF documents
With this PDF accessibility technique, headings are marked up using appropriate heading tags.

Technique PDF12: Providing name, role, and value information for form fields in PDF documents
With this PDF accessibility standard, form fields expose their name, role, and current value.

Technique PDF6: Using table markup for table information in PDF documents
Use table tags so assistive technology can determine row and column relationships. Mark header cells and data cells so tables are readable.

Technique PDF20: Using the Acrobat Table Editor to repair table structure
Use the Table Editor when a table was converted from an image or has incorrect cell associations.
"""


def test_table_query_keeps_table_techniques_only():
    ranked, focus = _rank_passages(
        "how tables are handled in pdf accessibility",
        "PDF Accessibility",
        _normalize_text(MANUAL),
    )
    assert "tables" in focus
    assert ranked
    joined = "\n".join(section for _score, section in ranked)
    assert "PDF6" in joined or "table markup" in joined.lower()
    assert "PDF20" in joined or "table editor" in joined.lower()
    assert "PDF1" not in ranked[0][1]
    assert "PDF9" not in ranked[0][1]
    assert "PDF12" not in ranked[0][1]
    extras = [section for _score, section in ranked[1:3]]
    assert all("table" in section.lower() for section in extras)


def test_heading_query_does_not_prefer_tables():
    ranked, focus = _rank_passages(
        "how headings are marked in pdf accessibility",
        "PDF Accessibility",
        _normalize_text(MANUAL),
    )
    assert "headings" in focus
    assert ranked
    assert "PDF9" in ranked[0][1] or "heading" in ranked[0][1].lower()
    assert "table markup" not in ranked[0][1].lower()
