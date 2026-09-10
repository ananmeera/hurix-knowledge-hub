from app.rag.engine import resolve_search_query

PDF16 = (
    "According to Technique PDF16, which PDF entry should be used to specify "
    "the document's default language, and why is it important?"
)

HISTORY = [
    {"role": "user", "content": PDF16},
    {
        "role": "assistant",
        "content": "Use the Lang entry.",
        "sources": [{"title": "Technique PDF16: Setting the default language using the Lang entry"}],
    },
]


def test_follow_up_keeps_technique_id():
    resolved = resolve_search_query("why is that important?", HISTORY)
    assert "pdf16" in resolved.lower()
    assert "lang" in resolved.lower() or "language" in resolved.lower()


def test_new_topic_is_not_mixed_with_pdf16():
    resolved = resolve_search_query("Does Hurix have a CMU Platform upload BOT?", HISTORY)
    assert resolved == "Does Hurix have a CMU Platform upload BOT?"
    assert "pdf16" not in resolved.lower()


def test_what_about_keeps_manual_context():
    history = [
        {"role": "user", "content": "how tables are handled in pdf accessibility"},
        {"role": "assistant", "content": "Use table markup.", "sources": [{"title": "Technique PDF6: Using table markup"}]},
    ]
    resolved = resolve_search_query("what about headings?", history)
    assert "headings" in resolved.lower()
    assert "pdf" in resolved.lower() or "accessibility" in resolved.lower() or "pdf6" in resolved.lower()
