import pytest

from longest_substring import length_of_longest_substring


def test_empty_string():
    assert length_of_longest_substring("") == 0


def test_single_character():
    assert length_of_longest_substring("a") == 1


def test_all_unique_characters():
    assert length_of_longest_substring("abcdef") == 6


def test_all_repeated_characters():
    assert length_of_longest_substring("aaaa") == 1


def test_classic_examples():
    assert length_of_longest_substring("abcabcbb") == 3
    assert length_of_longest_substring("bbbbb") == 1
    assert length_of_longest_substring("pwwkew") == 3


def test_repeating_after_unique_prefix():
    assert length_of_longest_substring("dvdf") == 3


def test_spaces_are_characters():
    assert length_of_longest_substring(" ") == 1
    assert length_of_longest_substring("a b c") == 3
    assert length_of_longest_substring("  a") == 2
    assert length_of_longest_substring("ab  cd") == 4


def test_mixed_punctuation_and_digits():
    assert length_of_longest_substring("a1!a1!") == 3
    assert length_of_longest_substring("12321") == 3


def test_unicode_emoji_regression():
    assert length_of_longest_substring("a🙂b🙂c") == 3


def test_unicode_japanese_regression():
    assert length_of_longest_substring("東京トウキョウ") == 6


def test_other_unicode():
    assert length_of_longest_substring("абвгд") == 5
    assert length_of_longest_substring("😀😁😂😀") == 3
    assert length_of_longest_substring("caféé") == 4


def test_window_resets_and_grows_again():
    assert length_of_longest_substring("abba") == 2
    assert length_of_longest_substring("tmmzuxt") == 5


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("", 0),
        ("au", 2),
        ("aab", 2),
        ("abcdeafbdgcbb", 7),
        ("anviaj", 5),
    ],
)
def test_additional_parametrized_cases(text: str, expected: int):
    assert length_of_longest_substring(text) == expected
