import pytest

from longest_substring import length_of_longest_substring


def test_empty_input():
    assert length_of_longest_substring("") == 0


def test_single_character():
    assert length_of_longest_substring("a") == 1


def test_all_unique_characters():
    assert length_of_longest_substring("abcdef") == 6


def test_all_repeated_characters():
    assert length_of_longest_substring("aaaa") == 1


def test_typical_repeating_pattern():
    assert length_of_longest_substring("abcabcbb") == 3
    assert length_of_longest_substring("bbbbb") == 1
    assert length_of_longest_substring("pwwkew") == 3


def test_repeat_at_start_and_end():
    assert length_of_longest_substring("abba") == 2
    assert length_of_longest_substring("dvdf") == 3
    assert length_of_longest_substring("tmmzuxt") == 5


def test_spaces_are_characters():
    assert length_of_longest_substring(" ") == 1
    assert length_of_longest_substring("a b c") == 3
    assert length_of_longest_substring("  a") == 2
    assert length_of_longest_substring("ab cd") == 5


def test_digits_and_punctuation():
    assert length_of_longest_substring("123321") == 3
    assert length_of_longest_substring("a!b!c") == 3
    assert length_of_longest_substring("!@# !") == 4


def test_unicode_emoji_regression():
    assert length_of_longest_substring("a🙂b🙂c") == 3


def test_unicode_cjk_regression():
    assert length_of_longest_substring("東京トウキョウ") == 6


def test_mixed_unicode_and_ascii():
    assert length_of_longest_substring("aαaβ") == 3
    assert length_of_longest_substring("🙂🙃🙂") == 2
    assert length_of_longest_substring("caféé") == 4


@pytest.mark.parametrize(
    "text, expected",
    [
        ("", 0),
        ("au", 2),
        ("aab", 2),
        ("abcdeafbdgcbb", 7),
        ("anviaj", 5),
        ("ggububgvfk", 6),
    ],
)
def test_additional_sliding_window_cases(text, expected):
    assert length_of_longest_substring(text) == expected
