import unittest

from three_sum import three_sum


def canonicalize(triplets):
    return sorted(sorted(t) for t in triplets)


class TestThreeSum(unittest.TestCase):
    def test_empty(self):
        self.assertEqual(three_sum([]), [])
        result = three_sum([])
        self.assertIsInstance(result, list)

    def test_length_less_than_3(self):
        self.assertEqual(three_sum([0]), [])
        self.assertEqual(three_sum([0, 0]), [])
        self.assertEqual(three_sum([1, -1]), [])
        self.assertEqual(three_sum([5, 5]), [])

    def test_no_valid_triplets(self):
        self.assertEqual(three_sum([1, 2, 3]), [])
        self.assertEqual(three_sum([-3, -2, -1]), [])
        self.assertEqual(three_sum([0, 1, 2]), [])
        self.assertEqual(three_sum([1, 2, -4]), [])  # sum = -1

    def test_all_zeros(self):
        self.assertEqual(three_sum([0, 0, 0]), [[0, 0, 0]])
        self.assertEqual(three_sum([0, 0, 0, 0]), [[0, 0, 0]])
        self.assertEqual(three_sum([0, 0, 0, 0, 0]), [[0, 0, 0]])
        result = three_sum([0, 0, 0])
        self.assertIsInstance(result, list)
        self.assertTrue(all(isinstance(t, list) for t in result))

    def test_mixed_negatives_positives(self):
        self.assertEqual(
            three_sum([-1, 0, 1, 2, -1, -4]),
            [[-1, -1, 2], [-1, 0, 1]],
        )

    def test_duplicates_uniqued(self):
        self.assertEqual(three_sum([-1, -1, -1, 2, 2]), [[-1, -1, 2]])
        self.assertEqual(three_sum([1, 1, -2, 1, -2]), [[-2, 1, 1]])
        self.assertEqual(
            three_sum([0, 0, 0, 1, -1]),
            [[-1, 0, 1], [0, 0, 0]],
        )

    def test_overlapping_triplets(self):
        self.assertEqual(
            three_sum([-2, 0, 1, 1, 2]),
            [[-2, 0, 2], [-2, 1, 1]],
        )
        self.assertEqual(
            three_sum([-4, -2, -2, -2, 0, 1, 2, 2, 2, 3, 3, 4, 4, 6, 6]),
            [
                [-4, -2, 6],
                [-4, 0, 4],
                [-4, 1, 3],
                [-4, 2, 2],
                [-2, -2, 4],
                [-2, 0, 2],
            ],
        )

    def test_unsorted_input(self):
        self.assertEqual(
            three_sum([3, -2, 1, 0, -1, 2, -3]),
            [[-3, 0, 3], [-3, 1, 2], [-2, -1, 3], [-2, 0, 2], [-1, 0, 1]],
        )
        self.assertEqual(
            three_sum([2, -1, 0, -2, 1, -1]),
            [[-2, 0, 2], [-1, -1, 2], [-1, 0, 1]],
        )

    def test_already_sorted_input(self):
        self.assertEqual(
            three_sum([-4, -1, -1, 0, 1, 2]),
            [[-1, -1, 2], [-1, 0, 1]],
        )
        self.assertEqual(
            three_sum([-3, -2, -1, 0, 1, 2, 3]),
            [[-3, 0, 3], [-3, 1, 2], [-2, -1, 3], [-2, 0, 2], [-1, 0, 1]],
        )

    def test_large_magnitude(self):
        self.assertEqual(
            three_sum([-10**9, 5 * 10**8, 5 * 10**8]),
            [[-1000000000, 500000000, 500000000]],
        )
        self.assertEqual(
            three_sum([10**9, -10**9, 0]),
            [[-1000000000, 0, 1000000000]],
        )
        self.assertEqual(
            three_sum([-10**9, -10**9, 2 * 10**9]),
            [[-1000000000, -1000000000, 2000000000]],
        )
        self.assertEqual(
            three_sum([10**9, 10**9, -2 * 10**9]),
            [[-2000000000, 1000000000, 1000000000]],
        )

    def test_canonicalization_of_number_and_triplet_order(self):
        # Same three values in many orders/positions must collapse to one sorted triplet.
        self.assertEqual(three_sum([1, -1, 0]), [[-1, 0, 1]])
        self.assertEqual(three_sum([0, 1, -1]), [[-1, 0, 1]])
        self.assertEqual(three_sum([-1, 1, 0]), [[-1, 0, 1]])
        self.assertEqual(three_sum([1, -1, 0, 0, 1, -1]), [[-1, 0, 1]])
        self.assertEqual(three_sum([2, -1, -1]), [[-1, -1, 2]])
        # Multiple distinct triplets: result order must be lex, not discovery order.
        self.assertEqual(
            three_sum([1, 2, -3, -1, 0]),
            [[-3, 1, 2], [-1, 0, 1]],
        )

    def test_input_immutability(self):
        cases = [[], [0, 0], [-1, 0, 1, 2, -1, -4], [0, 0, 0, 0], [3, 1, 2]]
        for nums in cases:
            original = nums.copy()
            result = three_sum(nums)
            self.assertEqual(nums, original)
            self.assertIsNot(nums, result)
            self.assertIsInstance(result, list)
            if result:
                self.assertIsInstance(result[0], list)
                result[0].append(999)
                self.assertEqual(nums, original)

        nums = [0, 1, -1]
        three_sum(nums)
        self.assertEqual(nums, [0, 1, -1])  # not sorted in place

    def test_single_valid_triplet(self):
        self.assertEqual(three_sum([1, 0, -1, 2]), [[-1, 0, 1]])

    def test_negatives_only_with_zeros(self):
        self.assertEqual(three_sum([-5, -1, 0, 0, 0]), [[0, 0, 0]])

    def test_two_same_one_opposite(self):
        self.assertEqual(three_sum([5, 5, -10]), [[-10, 5, 5]])


if __name__ == "__main__":
    unittest.main()
