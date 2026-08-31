def three_sum(nums: list[int]) -> list[list[int]]:
    """Return every unique triplet that sums to zero.

    Uses sort + two pointers. Does not mutate ``nums``.
    Triplets are emitted in sorted order of first, then second element.
    """
    n = len(nums)
    if n < 3:
        return []

    a = sorted(nums)
    res: list[list[int]] = []

    for i in range(n - 2):
        if i > 0 and a[i] == a[i - 1]:
            continue
        if a[i] > 0:
            break
        if a[i] + a[i + 1] + a[i + 2] > 0:
            break
        if a[i] + a[n - 2] + a[n - 1] < 0:
            continue

        L = i + 1
        R = n - 1
        while L < R:
            s = a[i] + a[L] + a[R]
            if s == 0:
                res.append([a[i], a[L], a[R]])
                L += 1
                R -= 1
                while L < R and a[L] == a[L - 1]:
                    L += 1
                while L < R and a[R] == a[R + 1]:
                    R -= 1
            elif s < 0:
                L += 1
                while L < R and a[L] == a[L - 1]:
                    L += 1
            else:
                R -= 1
                while L < R and a[R] == a[R + 1]:
                    R -= 1

    return res
