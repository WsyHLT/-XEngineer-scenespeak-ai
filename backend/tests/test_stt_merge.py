from app.services.stt_dashscope import merge_transcript_parts


def test_merge_multiple_sentences():
    assert (
        merge_transcript_parts(
            ["My name is Alice.", "I am a software engineer."],
            "",
        )
        == "My name is Alice. I am a software engineer."
    )


def test_merge_pending_tail():
    assert (
        merge_transcript_parts(
            ["First part done."],
            "Second part still streaming",
        )
        == "First part done. Second part still streaming"
    )


def test_merge_no_duplicate_tail():
    assert (
        merge_transcript_parts(["Hello world."], "Hello world.")
        == "Hello world."
    )
