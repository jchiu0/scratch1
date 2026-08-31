"""LeetCode 15 — 3Sum."""

from typing import List


def three_sum(nums: List[int]) -> List[List[int]]:
    """Return all unique triplets that sum to zero.

    Uses sort + fix one index + two pointers. Duplicate anchors and
    duplicate left/right values are skipped so each unique triplet
    appears at most once. Pairwise index distinctness holds because
    the left and right pointers always start after the anchor.
    """
    n = len(nums)
    if n < 3:
        return []

    nums = sorted(nums)
    result: List[List[int]] = []

    for i in range(n - 2):
        if i > 0 and nums[i] == nums[i - 1]:
            continue
        if nums[i] > 0:
            break
        if nums[i] + nums[i + 1] + nums[i + 2] > 0:
            break
        if nums[i] + nums[n - 2] + nums[n - 1] < 0:
            continue

        left, right = i + 1, n - 1
        while left < right:
            total = nums[i] + nums[left] + nums[right]
            if total == 0:
                result.append([nums[i], nums[left], nums[right]])
                left += 1
                right -= 1
                while left < right and nums[left] == nums[left - 1]:
                    left += 1
                while left < right and nums[right] == nums[right + 1]:
                    right -= 1
            elif total < 0:
                left += 1
            else:
                right -= 1

    return result
