def three_sum(nums: list[int]) -> list[list[int]]:
    """Return all unique triplets that sum to zero.

    Uses sort + two pointers so uniqueness is obtained by skipping
    duplicate values at the fixed index and at both pointers.
    """
    nums = sorted(nums)
    n = len(nums)
    res: list[list[int]] = []
    if n < 3:
        return res

    for i in range(n - 2):
        if nums[i] > 0:
            break
        if i > 0 and nums[i] == nums[i - 1]:
            continue
        if nums[i] + nums[i + 1] + nums[i + 2] > 0:
            continue
        if nums[i] + nums[n - 2] + nums[n - 1] < 0:
            continue

        left, right = i + 1, n - 1
        while left < right:
            total = nums[i] + nums[left] + nums[right]
            if total == 0:
                res.append([nums[i], nums[left], nums[right]])
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
    return res
