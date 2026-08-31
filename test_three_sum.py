import collections
import unittest

from three_sum import three_sum


class TestThreeSum(unittest.TestCase):
    def normalize(self, triplets):
        return sorted(tuple(sorted(t)) for t in triplets)

    def assertTripletsEqual(self, actual, expected):
        self.assertEqual(self.normalize(actual), self.normalize(expected))

    def assertResultInvariants(self, nums, actual):
        counts = collections.Counter(nums)
        normalized = self.normalize(actual)
        self.assertEqual(len(normalized), len(set(normalized)))
        for triplet in actual:
            self.assertEqual(len(triplet), 3)
            self.assertEqual(sum(triplet), 0)
            self.assertTrue(collections.Counter(triplet) <= counts)

    def test_empty_list(self):
        nums = []
        actual = three_sum(list(nums))
        self.assertTripletsEqual(actual, [])
        self.assertResultInvariants(nums, actual)

    def test_single_element(self):
        nums = [0]
        actual = three_sum(list(nums))
        self.assertTripletsEqual(actual, [])
        self.assertResultInvariants(nums, actual)

    def test_two_elements_zeros(self):
        nums = [0, 0]
        actual = three_sum(list(nums))
        self.assertTripletsEqual(actual, [])
        self.assertResultInvariants(nums, actual)

    def test_two_elements_nonzero(self):
        nums = [1, -1]
        actual = three_sum(list(nums))
        self.assertTripletsEqual(actual, [])
        self.assertResultInvariants(nums, actual)

    def test_length_three_no_triplet(self):
        nums = [1, 2, 3]
        actual = three_sum(list(nums))
        self.assertTripletsEqual(actual, [])
        self.assertResultInvariants(nums, actual)

    def test_no_valid_triplet_mixed(self):
        nums = [-1, 2, 3, 5]
        actual = three_sum(list(nums))
        self.assertTripletsEqual(actual, [])
        self.assertResultInvariants(nums, actual)

    def test_single_valid_triplet(self):
        nums = [-1, 0, 1]
        actual = three_sum(list(nums))
        self.assertTripletsEqual(actual, [(-1, 0, 1)])
        self.assertResultInvariants(nums, actual)

    def test_length_three_with_duplicate_values(self):
        nums = [-2, 1, 1]
        actual = three_sum(list(nums))
        self.assertTripletsEqual(actual, [(-2, 1, 1)])
        self.assertResultInvariants(nums, actual)

    def test_leetcode_example_negatives(self):
        nums = [-1, 0, 1, 2, -1, -4]
        actual = three_sum(list(nums))
        self.assertTripletsEqual(actual, [(-1, -1, 2), (-1, 0, 1)])
        self.assertResultInvariants(nums, actual)

    def test_leetcode_example_no_solution(self):
        nums = [0, 1, 1]
        actual = three_sum(list(nums))
        self.assertTripletsEqual(actual, [])
        self.assertResultInvariants(nums, actual)

    def test_all_zeros_exactly_three(self):
        nums = [0, 0, 0]
        actual = three_sum(list(nums))
        self.assertTripletsEqual(actual, [(0, 0, 0)])
        self.assertResultInvariants(nums, actual)

    def test_all_zeros_many(self):
        nums = [0, 0, 0, 0]
        actual = three_sum(list(nums))
        self.assertTripletsEqual(actual, [(0, 0, 0)])
        self.assertResultInvariants(nums, actual)

    def test_duplicates_must_be_skipped(self):
        nums = [-1, -1, -1, 2, 2]
        actual = three_sum(list(nums))
        self.assertTripletsEqual(actual, [(-1, -1, 2)])
        self.assertResultInvariants(nums, actual)

    def test_duplicate_positives_one_triplet(self):
        nums = [-2, 1, 1, 1]
        actual = three_sum(list(nums))
        self.assertTripletsEqual(actual, [(-2, 1, 1)])
        self.assertResultInvariants(nums, actual)

    def test_negatives_and_positives_symmetric(self):
        nums = [-2, -1, 0, 1, 2]
        actual = three_sum(list(nums))
        self.assertTripletsEqual(actual, [(-2, 0, 2), (-1, 0, 1)])
        self.assertResultInvariants(nums, actual)

    def test_all_same_nonzero_positive(self):
        nums = [1, 1, 1, 1]
        actual = three_sum(list(nums))
        self.assertTripletsEqual(actual, [])
        self.assertResultInvariants(nums, actual)

    def test_all_same_nonzero_negative(self):
        nums = [-5, -5, -5]
        actual = three_sum(list(nums))
        self.assertTripletsEqual(actual, [])
        self.assertResultInvariants(nums, actual)

    def test_two_plus_third_to_zero(self):
        nums = [-4, 1, 3]
        actual = three_sum(list(nums))
        self.assertTripletsEqual(actual, [(-4, 1, 3)])
        self.assertResultInvariants(nums, actual)

    def test_unsorted_input_order_irrelevant(self):
        nums = [3, 0, -3, 1, -1]
        actual = three_sum(list(nums))
        self.assertTripletsEqual(actual, [(-3, 0, 3), (-1, 0, 1)])
        self.assertResultInvariants(nums, actual)

    def test_many_duplicates_zeros_and_pairs(self):
        nums = [-2, -2, -2, 0, 0, 0, 2, 2, 2]
        actual = three_sum(list(nums))
        self.assertTripletsEqual(actual, [(-2, 0, 2), (0, 0, 0)])
        self.assertResultInvariants(nums, actual)

    def test_many_duplicates_consecutive_values(self):
        nums = [-1, -1, -1, 0, 0, 0, 1, 1, 1]
        actual = three_sum(list(nums))
        self.assertTripletsEqual(actual, [(-1, 0, 1), (0, 0, 0)])
        self.assertResultInvariants(nums, actual)

    def test_large_mixed_leetcode_style(self):
        nums = [-4, -2, -2, -2, 0, 1, 2, 2, 2, 3, 3, 4, 4, 6, 6]
        actual = three_sum(list(nums))
        self.assertTripletsEqual(
            actual,
            [
                (-4, -2, 6),
                (-4, 0, 4),
                (-4, 1, 3),
                (-4, 2, 2),
                (-2, -2, 4),
                (-2, 0, 2),
            ],
        )
        self.assertResultInvariants(nums, actual)

    def test_repeated_pair_collapsed(self):
        nums = [1, -1, 0, 1, -1]
        actual = three_sum(list(nums))
        self.assertTripletsEqual(actual, [(-1, 0, 1)])
        self.assertResultInvariants(nums, actual)

    def test_no_zero_but_valid_triplets(self):
        nums = [-5, -1, 2, 3, 4]
        actual = three_sum(list(nums))
        self.assertTripletsEqual(actual, [(-5, 2, 3)])
        self.assertResultInvariants(nums, actual)

    def test_positive_heavy_one_negative(self):
        nums = [-10, 1, 2, 3, 7, 8]
        actual = three_sum(list(nums))
        self.assertTripletsEqual(actual, [(-10, 2, 8), (-10, 3, 7)])
        self.assertResultInvariants(nums, actual)

    def test_negative_heavy_one_positive(self):
        nums = [-8, -7, -3, -2, 1, 10]
        actual = three_sum(list(nums))
        self.assertTripletsEqual(actual, [(-8, -2, 10), (-7, -3, 10)])
        self.assertResultInvariants(nums, actual)

    def test_output_uniqueness_not_permutations(self):
        nums = [-1, 0, 1]
        actual = three_sum(list(nums))
        self.assertEqual(len(self.normalize(actual)), 1)
        self.assertTripletsEqual(actual, [(-1, 0, 1)])
        self.assertResultInvariants(nums, actual)

    def test_result_invariants(self):
        nums = [-1, 0, 1, 2, -1, -4]
        actual = three_sum(list(nums))
        self.assertResultInvariants(nums, actual)
        for triplet in actual:
            self.assertEqual(len(triplet), 3)
            self.assertEqual(sum(triplet), 0)
        self.assertEqual(len(self.normalize(actual)), len(set(self.normalize(actual))))
        counts = collections.Counter(nums)
        for triplet in actual:
            self.assertTrue(collections.Counter(triplet) <= counts)
        self.assertTripletsEqual(actual, [(-1, -1, 2), (-1, 0, 1)])


if __name__ == "__main__":
    unittest.main()
