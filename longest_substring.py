def length_of_longest_substring(text: str) -> int:
    """Return the length of the longest substring without repeating characters.

    Uses a sliding window with a last-seen index map so each character is
    processed in linear time, including Unicode code points.
    """
    last_seen: dict[str, int] = {}
    start = 0
    longest = 0

    for index, char in enumerate(text):
        previous = last_seen.get(char)
        if previous is not None and previous >= start:
            start = previous + 1
        last_seen[char] = index
        window = index - start + 1
        if window > longest:
            longest = window

    return longest
