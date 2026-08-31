"""Comprehensive tests for LeetCode 15 — 3Sum."""

from collections import Counter
from itertools import combinations
import random

import pytest

from three_sum import three_sum


def canon(triplets):
    return sorted(tuple(sorted(t)) for t in triplets)


def assert_valid_result(nums, result, expected=None):
    """Assert structural invariants and optional expected equality."""
    assert isinstance(result, list)
    for t in result:
        assert len(t) == 3
        assert t[0] + t[1] + t[2] == 0

    canonical = canon(result)
    assert canonical == sorted(set(canonical)), "duplicate canonical triplets"

    counts = Counter(nums)
    for t in result:
        need = Counter(t)
        for v, c in need.items():
            assert counts[v] >= c, "values must come from input multiset with distinct indices"

    if expected is not None:
        assert canon(result) == canon(expected)


def brute_force_three_sum(nums):
    """Oracle: unique triplets by value, n should stay small."""
    n = len(nums)
    found = set()
    for i, j, k in combinations(range(n), 3):
        a, b, c = nums[i], nums[j], nums[k]
        if a + b + c == 0:
            found.add(tuple(sorted((a, b, c))))
    return [list(t) for t in sorted(found)]


# ---------------------------------------------------------------------------
# Typical LeetCode examples
# ---------------------------------------------------------------------------

def test_example_leetcode_1():
    nums = [-1, 0, 1, 2, -1, -4]
    expected = [[-1, -1, 2], [-1, 0, 1]]
    assert_valid_result(nums, three_sum(nums), expected)


def test_example_leetcode_2_no_triplets():
    nums = [0, 1, 1]
    expected = []
    assert_valid_result(nums, three_sum(nums), expected)


def test_example_leetcode_3_all_zeros():
    nums = [0, 0, 0]
    expected = [[0, 0, 0]]
    assert_valid_result(nums, three_sum(nums), expected)


# ---------------------------------------------------------------------------
# Edges
# ---------------------------------------------------------------------------

def test_empty():
    nums = []
    assert_valid_result(nums, three_sum(nums), [])


def test_length_one():
    nums = [0]
    assert_valid_result(nums, three_sum(nums), [])


def test_length_two():
    nums = [1, -1]
    assert_valid_result(nums, three_sum(nums), [])


def test_length_three_valid():
    nums = [-1, 0, 1]
    assert_valid_result(nums, three_sum(nums), [[-1, 0, 1]])


def test_length_three_invalid():
    nums = [1, 2, 3]
    assert_valid_result(nums, three_sum(nums), [])


def test_all_zeros_more_than_three():
    nums = [0, 0, 0, 0, 0]
    assert_valid_result(nums, three_sum(nums), [[0, 0, 0]])


def test_two_zeros_insufficient_for_zero_triplet():
    nums = [0, 0, 1, -2]
    # [0, 0, 0] is impossible (only two zeros); [-2, 0, 2] needs a 2.
    # Valid: [-2, 1, 1] needs two 1s. Here only [-2, 0? wait  -2+0+1=-1 no, -2+0+0=-2].
    expected = []
    assert_valid_result(nums, three_sum(nums), expected)

    nums2 = [0, 0, 2, -2]
    expected2 = [[-2, 0, 2]]
    assert_valid_result(nums2, three_sum(nums2), expected2)

    nums3 = [0, 0, 0, 1]
    expected3 = [[0, 0, 0]]
    assert_valid_result(nums3, three_sum(nums3), expected3)


def test_all_positive():
    nums = [1, 2, 3, 4, 5]
    assert_valid_result(nums, three_sum(nums), [])


def test_all_negative():
    nums = [-5, -4, -3, -2, -1]
    assert_valid_result(nums, three_sum(nums), [])


def test_zeros_and_positives_only():
    nums = [0, 1, 2, 3]
    assert_valid_result(nums, three_sum(nums), [])


def test_zeros_and_negatives_only():
    nums = [-3, -2, -1, 0]
    assert_valid_result(nums, three_sum(nums), [])


def test_mixed_no_zero_sum():
    nums = [-2, -1, 4, 5]
    assert_valid_result(nums, three_sum(nums), [])


def test_duplicate_triplets_collapsed():
    nums = [-1, -1, -1, 2, 2]
    assert_valid_result(nums, three_sum(nums), [[-1, -1, 2]])


def test_large_duplicate_counts():
    nums = [-2] * 50 + [1] * 50
    assert_valid_result(nums, three_sum(nums), [[-2, 1, 1]])


def test_zero_with_symmetric_pairs():
    nums = [-4, -2, -2, 0, 0, 2, 2, 4]
    expected = [[-4, 0, 4], [-4, 2, 2], [-2, -2, 4], [-2, 0, 2]]
    assert_valid_result(nums, three_sum(nums), expected)


def test_multiple_overlapping_triplets():
    nums = [-4, -1, -1, 0, 1, 2]
    expected = [[-1, -1, 2], [-1, 0, 1]]
    assert_valid_result(nums, three_sum(nums), expected)


def test_one_value_participates_in_many_triplets():
    nums = [-4, -2, -1, 0, 1, 2, 3, 4]
    expected = [
        [-4, 0, 4],
        [-4, 1, 3],
        [-2, -1, 3],
        [-2, 0, 2],
        [-1, 0, 1],
    ]
    assert_valid_result(nums, three_sum(nums), expected)


def test_asymmetric_values():
    nums = [3, 0, -2, -1, 1, 2]
    expected = [[-2, -1, 3], [-2, 0, 2], [-1, 0, 1]]
    assert_valid_result(nums, three_sum(nums), expected)


def test_same_value_used_twice_when_count_allows():
    nums = [-2, 1, 1]
    assert_valid_result(nums, three_sum(nums), [[-2, 1, 1]])
    nums2 = [-2, 1]
    assert_valid_result(nums2, three_sum(nums2), [])


def test_value_range_extremes():
    nums = [-(10**5), 0, 10**5, -(10**5), 10**5, 1, -1]
    expected = [[-(10**5), 0, 10**5], [-1, 0, 1]]
    assert_valid_result(nums, three_sum(nums), expected)


def test_result_has_no_duplicate_canonical_triplets():
    nums = [-1, -1, -1, 0, 0, 1, 1, 2, 2]
    result = three_sum(nums)
    canonical = canon(result)
    assert canonical == sorted(set(canonical))
    assert_valid_result(nums, result)


def test_every_returned_triplet_sums_to_zero():
    nums = [-5, -1, -1, 0, 2, 3, 4, 6]
    result = three_sum(nums)
    for t in result:
        assert t[0] + t[1] + t[2] == 0
    assert_valid_result(nums, result)


def test_returned_values_respect_input_multiset():
    nums = [-2, -2, 1, 1, 0, 4]
    result = three_sum(nums)
    counts = Counter(nums)
    for t in result:
        need = Counter(t)
        for v, c in need.items():
            assert counts[v] >= c
    assert_valid_result(nums, result)


# ---------------------------------------------------------------------------
# Parametrized compact case table
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "nums, expected",
    [
        ([], []),
        ([0], []),
        ([0, 0], []),
        ([1, 2], []),
        ([0, 0, 0], [[0, 0, 0]]),
        ([0, 0, 0, 0], [[0, 0, 0]]),
        ([-1, 0, 1], [[-1, 0, 1]]),
        ([1, 2, 3], []),
        ([-1, -1, -1, 2, 2], [[-1, -1, 2]]),
        ([-2, 0, 1, 1, 2], [[-2, 0, 2], [-2, 1, 1]]),
        ([-4, -1, -1, 0, 1, 2], [[-1, -1, 2], [-1, 0, 1]]),
        ([1, 2, 3, 4, 5], []),
        ([-5, -4, -3, -2, -1], []),
        ([3, 0, -2, -1, 1, 2], [[-2, -1, 3], [-2, 0, 2], [-1, 0, 1]]),
        ([-2, 1, 1], [[-2, 1, 1]]),
        ([-2, 1], []),
    ],
)
def test_parametrized_cases(nums, expected):
    assert_valid_result(nums, three_sum(nums), expected)


# ---------------------------------------------------------------------------
# Brute-force oracle comparisons
# ---------------------------------------------------------------------------

ORACLE_HAND_CASES = [
    [],
    [0],
    [0, 0],
    [0, 0, 0],
    [0, 0, 0, 0],
    [-1, 0, 1, 2, -1, -4],
    [0, 1, 1],
    [-1, -1, -1, 2, 2],
    [-2, 0, 1, 1, 2],
    [-4, -2, -2, 0, 0, 2, 2, 4],
    [3, 0, -2, -1, 1, 2],
    [-4, -2, -1, 0, 1, 2, 3, 4],
    [1, 2, 3, 4, 5],
    [-5, -4, -3, -2, -1],
    [0, 1, 2, 3],
    [-3, -2, -1, 0],
    [-2, -1, 4, 5],
    [-2] * 10 + [1] * 10,
    [0, 0, 1, -2],
    [-(10**5), 0, 10**5],
]


@pytest.mark.parametrize("nums", ORACLE_HAND_CASES)
def test_oracle_hand_cases(nums):
    assert n_ok_for_oracle(nums)
    got = three_sum(nums)
    expected = brute_force_three_sum(nums)
    assert canon(got) == canon(expected)
    assert_valid_result(nums, got, expected)


def n_ok_for_oracle(nums):
    return len(nums) <= 30


def test_oracle_random_small_arrays():
    rng = random.Random(20260328)
    for seed in range(50):
        local = random.Random(seed + rng.randint(0, 10**6))
        n = local.randint(0, 25)
        nums = [local.randint(-20, 20) for _ in range(n)]
        got = three_sum(nums)
        expected = brute_force_three_sum(nums)
        assert canon(got) == canon(expected), (seed, nums, got, expected)
        assert_valid_result(nums, got, expected)


# ---------------------------------------------------------------------------
# Order / mutation / stress
# ---------------------------------------------------------------------------

def test_does_not_depend_on_input_order():
    base = [-4, -1, -1, 0, 1, 2, 3, -2, 4]
    expected = canon(three_sum(base))
    permutations_like = [
        list(reversed(base)),
        sorted(base),
        sorted(base, reverse=True),
        base[::2] + base[1::2],
    ]
    rng = random.Random(7)
    shuffled = list(base)
    for _ in range(10):
        rng.shuffle(shuffled)
        permutations_like.append(list(shuffled))
    for variant in permutations_like:
        assert canon(three_sum(variant)) == expected


def test_does_not_mutate_input():
    nums = [-1, 0, 1, 2, -1, -4]
    original = list(nums)
    _ = three_sum(nums)
    assert nums == original

    nums2 = [3, 1, 2, 0, -1]
    original2 = list(nums2)
    _ = three_sum(nums2)
    assert nums2 == original2


def test_stress_invariants_full_range():
    nums = list(range(-50, 51))
    result = three_sum(nums)
    canonical = set(canon(result))
    assert (-1, 0, 1) in canonical
    assert (0, 0, 0) not in canonical
    assert_valid_result(nums, result)
    # spot-check a few more known triples
    assert (-2, 0, 2) in canonical
    assert (-50, 0, 50) in canonical
    assert (-50, 1, 49) in canonical


def test_heavy_duplicates():
    nums = [-5] * 200 + [0] * 200 + [5] * 200
    result = three_sum(nums)
    expected = [[-5, 0, 5], [0, 0, 0]]
    assert_valid_result(nums, result, expected)
    assert canon(result) == canon(expected)
