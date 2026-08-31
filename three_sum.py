"""LeetCode 15 — 3Sum (sort + two pointers)."""

from typing import List


def three_sum(nums: List[int]) -> List[List[int]]:
    """Return all unique triplets that sum to zero.

    Does not mutate the caller input: a sorted copy is used.
    """
    n = len(nums)
    if n < 3:
        return []
    nums = sorted(nums)  # copy+sort so caller input is not mutated
    res: List[List[int]] = []
    for i in range(n - 2):
        if nums[i] > 0:
            break
        if i > 0 and nums[i] == nums[i - 1]:
            continue
        if nums[i] + nums[i + 1] + nums[i + 2] > 0:
            break
        if nums[i] + nums[n - 2] + nums[n - 1] < 0:
            continue
        L, R = i + 1, n - 1
        while L < R:
            s = nums[i] + nums[L] + nums[R]
            if s == 0:
                res.append([nums[i], nums[L], nums[R]])
                L += 1
                R -= 1
                while L < R and nums[L] == nums[L - 1]:
                    L += 1
                while L < R and nums[R] == nums[R + 1]:
                    R -= 1
            elif s < 0:
                L += 1
            else:
                R -= 1
    return res
