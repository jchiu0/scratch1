def three_sum(nums: list[int]) -> list[list[int]]:
    """Return every unique triplet that sums to zero without mutating nums."""
    sorted_nums = sorted(nums)
    n = len(sorted_nums)
    triplets: list[list[int]] = []

    for i in range(n - 2):
        if i > 0 and sorted_nums[i] == sorted_nums[i - 1]:
            continue
        if sorted_nums[i] > 0:
            break

        left = i + 1
        right = n - 1
        target = -sorted_nums[i]

        while left < right:
            pair_sum = sorted_nums[left] + sorted_nums[right]
            if pair_sum == target:
                triplets.append([sorted_nums[i], sorted_nums[left], sorted_nums[right]])
                left += 1
                right -= 1
                while left < right and sorted_nums[left] == sorted_nums[left - 1]:
                    left += 1
                while left < right and sorted_nums[right] == sorted_nums[right + 1]:
                    right -= 1
            elif pair_sum < target:
                left += 1
            else:
                right -= 1

    return triplets
