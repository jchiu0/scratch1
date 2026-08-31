def three_sum(nums: list[int]) -> list[list[int]]:
    """Return every unique triplet whose values sum to zero.

    Each triplet is sorted, the overall result is sorted for determinism,
    and the input list is not mutated.
    """
    n = len(nums)
    if n < 3:
        return []

    sorted_nums = sorted(nums)
    result: list[list[int]] = []

    for i in range(n - 2):
        if i > 0 and sorted_nums[i] == sorted_nums[i - 1]:
            continue
        if sorted_nums[i] > 0:
            break

        left = i + 1
        right = n - 1
        target = -sorted_nums[i]

        while left < right:
            current = sorted_nums[left] + sorted_nums[right]
            if current == target:
                result.append([sorted_nums[i], sorted_nums[left], sorted_nums[right]])
                left += 1
                right -= 1
                while left < right and sorted_nums[left] == sorted_nums[left - 1]:
                    left += 1
                while left < right and sorted_nums[right] == sorted_nums[right + 1]:
                    right -= 1
            elif current < target:
                left += 1
            else:
                right -= 1

    result.sort()
    return result
