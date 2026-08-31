def length_of_longest_substring(text: str) -> int:
    """Return the length of the longest substring without repeating characters.

    Uses a sliding window with a map of the most recent index of each
    character so the scan is O(n) time and O(min(n, alphabet)) space.
    """
    last_seen: dict[str, int] = {}
    start = 0
    longest = 0

    for index, char in enumerate(text):
        previous = last_seen.get(char)
        if previous is not None and previous >= start:
            start = previous + 1
        last_seen[char] = index
        longest = max(longest, index - start + 1)

    return longest
