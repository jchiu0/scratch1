"""Pytest coverage for three_sum."""

from typing import List, Sequence

import pytest

from three_sum import three_sum


def normalize(triplets: Sequence[Sequence[int]]) -> List[tuple]:
    return sorted(tuple(sorted(t)) for t in triplets)


def assert_unique_triplets(nums: List[int], expected: List[List[int]]) -> None:
    result = three_sum(nums)
    assert all(len(t) == 3 for t in result)
    assert all(sum(t) == 0 for t in result)
    assert len(normalize(result)) == len(result)
    assert normalize(result) == normalize(expected)


@pytest.mark.parametrize(
    "nums, expected",
    [
        ([], []),
    ],
)
def test_empty_array(nums, expected):
    assert_unique_triplets(nums, expected)


@pytest.mark.parametrize(
    "nums, expected",
    [
        ([0], []),
        ([1, -1], []),
        ([0, 0], []),
    ],
)
def test_fewer_than_three_elements(nums, expected):
    assert_unique_triplets(nums, expected)


@pytest.mark.parametrize(
    "nums, expected",
    [
        ([0, 0, 0], [[0, 0, 0]]),
        ([0, 0, 0, 0], [[0, 0, 0]]),
    ],
)
def test_all_zeros(nums, expected):
    assert_unique_triplets(nums, expected)


@pytest.mark.parametrize(
    "nums, expected",
    [
        ([1, 2, 3], []),
        ([-5, -4, -3], []),
        ([1, 2, 4, 8], []),
        ([0, 0, 1], []),
        ([0, 0, -1], []),
    ],
)
def test_no_valid_triplets(nums, expected):
    assert_unique_triplets(nums, expected)


def test_typical_mixed_positive_negative():
    assert_unique_triplets(
        [-1, 0, 1, 2, -1, -4],
        [[-1, -1, 2], [-1, 0, 1]],
    )


@pytest.mark.parametrize(
    "nums, expected",
    [
        ([-1, -1, -1, 2, 2], [[-1, -1, 2]]),
        ([-2, 0, 0, 2, 2], [[-2, 0, 2]]),
    ],
)
def test_duplicates_yield_unique_triplets_only(nums, expected):
    assert_unique_triplets(nums, expected)


@pytest.mark.parametrize(
    "nums, expected",
    [
        ([-2, 0, 1, 1, 2], [[-2, 0, 2], [-2, 1, 1]]),
        ([-1, 0, 1, 0], [[-1, 0, 1]]),
    ],
)
def test_multiple_valid_triplets(nums, expected):
    assert_unique_triplets(nums, expected)


def test_already_sorted_input():
    assert_unique_triplets(
        [-4, -1, -1, 0, 1, 2],
        [[-1, -1, 2], [-1, 0, 1]],
    )


def test_reverse_sorted_input():
    assert_unique_triplets(
        [2, 1, 0, -1, -1, -4],
        [[-1, -1, 2], [-1, 0, 1]],
    )


def test_larger_mixed_array():
    assert_unique_triplets(
        [-4, -2, -2, -2, 0, 1, 2, 2, 2, 3, 3, 4, 4, 6, 6],
        [
            [-4, -2, 6],
            [-4, 0, 4],
            [-4, 1, 3],
            [-4, 2, 2],
            [-2, -2, 4],
            [-2, 0, 2],
        ],
    )


def test_single_triplet_with_noise():
    assert_unique_triplets([-2, 0, 2, 5], [[-2, 0, 2]])


def test_boundary_values():
    assert_unique_triplets(
        [-100000, 50000, 50000],
        [[-100000, 50000, 50000]],
    )


@pytest.mark.parametrize(
    "nums",
    [
        [-1, 0, 1, 2, -1, -4],
        [-4, -1, 2, 1, 0, -1],
        [2, -4, -1, 0, 1, -1],
        [0, 1, -1, -4, 2, -1],
        [-1, -4, 2, 0, 1, -1],
    ],
)
def test_permutation_invariance(nums):
    expected = [[-1, -1, 2], [-1, 0, 1]]
    assert_unique_triplets(nums, expected)
