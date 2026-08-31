import unittest

from three_sum import three_sum


class TestThreeSum(unittest.TestCase):
    def test_canonical_example(self):
        nums = [-1, 0, 1, 2, -1, -4]
        expected = [[-1, -1, 2], [-1, 0, 1]]
        self.assertEqual(three_sum(nums), expected)

    def test_duplicate_values(self):
        nums = [-2, 0, 0, 2, 2]
        expected = [[-2, 0, 2]]
        self.assertEqual(three_sum(nums), expected)

        nums = [-1, -1, -1, 2, 2]
        expected = [[-1, -1, 2]]
        self.assertEqual(three_sum(nums), expected)

        nums = [0, 0, 0, 0]
        expected = [[0, 0, 0]]
        self.assertEqual(three_sum(nums), expected)

        nums = [-4, -2, -2, -2, 0, 1, 2, 2, 2, 3, 3, 4, 4, 6, 6]
        expected = [
            [-4, -2, 6],
            [-4, 0, 4],
            [-4, 1, 3],
            [-4, 2, 2],
            [-2, -2, 4],
            [-2, 0, 2],
        ]
        self.assertEqual(three_sum(nums), expected)

    def test_all_zeroes(self):
        nums = [0, 0, 0]
        expected = [[0, 0, 0]]
        self.assertEqual(three_sum(nums), expected)

        nums = [0, 0, 0, 0, 0]
        expected = [[0, 0, 0]]
        self.assertEqual(three_sum(nums), expected)

    def test_no_solution(self):
        self.assertEqual(three_sum([]), [])
        self.assertEqual(three_sum([0]), [])
        self.assertEqual(three_sum([1, 2]), [])
        self.assertEqual(three_sum([1, 2, 3]), [])
        self.assertEqual(three_sum([1, 2, -4]), [])
        self.assertEqual(three_sum([5, 4, 3, 2, 1]), [])

    def test_input_preservation(self):
        nums = [-1, 0, 1, 2, -1, -4]
        original = nums.copy()
        three_sum(nums)
        self.assertEqual(nums, original)
        self.assertIsNot(three_sum(nums), nums)

        nums = [0, 0, 0]
        original = nums.copy()
        three_sum(nums)
        self.assertEqual(nums, original)

        nums = [3, 1, 2]
        original = nums.copy()
        three_sum(nums)
        self.assertEqual(nums, original)

    def test_triplets_are_sorted(self):
        result = three_sum([-1, 0, 1, 2, -1, -4])
        for triplet in result:
            self.assertEqual(triplet, sorted(triplet))

    def test_result_is_deterministic(self):
        nums = [-4, -1, -1, 0, 1, 2]
        first = three_sum(nums)
        second = three_sum(list(reversed(nums)))
        self.assertEqual(first, second)
        self.assertEqual(first, sorted(first))

    def test_negative_and_positive_mix(self):
        nums = [-5, -1, 0, 1, 2, 3, 4]
        expected = [[-5, 1, 4], [-5, 2, 3], [-1, 0, 1]]
        self.assertEqual(three_sum(nums), expected)

    def test_single_valid_triplet(self):
        nums = [-2, 1, 1]
        expected = [[-2, 1, 1]]
        self.assertEqual(three_sum(nums), expected)


if __name__ == "__main__":
    unittest.main()
