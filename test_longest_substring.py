import pytest

from longest_substring import length_of_longest_substring


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("", 0),
        ("a", 1),
        (" ", 1),
        ("  ", 1),
        ("bbbbb", 1),
        ("aaaaaa", 1),
        ("abcabcbb", 3),
        ("pwwkew", 3),
        ("abcdef", 6),
        ("dvdf", 3),
        ("abba", 2),
        ("tmmzuxt", 5),
        ("au", 2),
        ("aab", 2),
        ("abc a", 4),
        ("a b c", 3),
        ("  a  ", 2),
        ("你好世界", 4),
        ("你好你好", 2),
        ("abc你好abc", 5),
        ("🙂🙃🙂", 2),
        ("a🙂b🙂c", 4),
        ("abc\ndef", 7),
        ("ab\nab", 3),
        ("!@# !@#", 4),
        ("anviaj", 5),
        ("bbtablud", 6),
        ("nfpdmpi", 5),
        ("wobgrovw", 6),
        ("abcde" * 20, 5),
        ("abcdefghijklmnopqrstuvwxyz", 26),
        ("a" * 1000, 1),
        (" " + "a" * 50 + " ", 2),
        ("😀😃😄😁😆", 5),
        ("😀a😀", 2),
        ("東京トウキョウ", 5),
        ("абвгд аб", 6),
    ],
)
def test_length_of_longest_substring(text: str, expected: int) -> None:
    assert length_of_longest_substring(text) == expected


def test_empty_input() -> None:
    assert length_of_longest_substring("") == 0


def test_all_same_characters() -> None:
    assert length_of_longest_substring("zzzzzzzz") == 1


def test_spaces_only() -> None:
    assert length_of_longest_substring("     ") == 1


def test_spaces_mixed_with_letters() -> None:
    assert length_of_longest_substring("abc def") == 7
    assert length_of_longest_substring("ab  c") == 3


def test_unicode_combining_and_cjk() -> None:
    assert length_of_longest_substring("éé") == 1
    assert length_of_longest_substring("éèê") == 3
    assert length_of_longest_substring("漢字漢字") == 2
    assert length_of_longest_substring("한글abc한글") == 5


def test_window_resets_after_repeat() -> None:
    assert length_of_longest_substring("abcdeafbdgcbb") == 7


def test_single_repeat_at_end() -> None:
    assert length_of_longest_substring("abcdefa") == 6


def test_does_not_mutate_input() -> None:
    text = "abcabc"
    length_of_longest_substring(text)
    assert text == "abcabc"
