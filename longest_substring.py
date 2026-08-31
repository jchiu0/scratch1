def length_of_longest_substring(text: str) -> int:
    """Return the length of the longest substring without repeating characters.

    Uses a sliding window with a last-seen index map so each character is
    processed in linear time.
    """
    last_seen: dict[str, int] = {}
    start = 0
    longest = 0

    for index, char in enumerate(text):
        if char in last_seen and last_seen[char] >= start:
            start = last_seen[char] + 1
        last_seen[char] = index
        window_length = index - start + 1
        if window_length > longest:
            longest = window_length

    return longest
