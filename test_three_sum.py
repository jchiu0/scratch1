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

    def test_all_zeroes(self):
        nums = [0, 0, 0, 0]
        expected = [[0, 0, 0]]
        self.assertEqual(three_sum(nums), expected)

    def test_no_solution(self):
        nums = [1, 2, 3, 4]
        self.assertEqual(three_sum(nums), [])

    def test_input_preservation(self):
        nums = [-1, 0, 1, 2, -1, -4]
        original = list(nums)
        three_sum(nums)
        self.assertEqual(nums, original)

    def test_empty_and_short_inputs(self):
        self.assertEqual(three_sum([]), [])
        self.assertEqual(three_sum([0]), [])
        self.assertEqual(three_sum([0, 1]), [])

    def test_triplets_are_sorted_and_deterministic(self):
        nums = [3, -2, 1, 0, -1, 2, -3, 4, -4]
        result = three_sum(nums)
        for triplet in result:
            self.assertEqual(triplet, sorted(triplet))
        self.assertEqual(result, sorted(result))
        self.assertEqual(len(result), len({tuple(t) for t in result}))
        for a, b, c in result:
            self.assertEqual(a + b + c, 0)


if __name__ == "__main__":
    unittest.main()
