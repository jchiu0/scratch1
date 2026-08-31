import unittest

from task_tracker import add_task, complete_task


class TestAddTask(unittest.TestCase):
    def test_add_to_empty_list(self):
        tasks = []
        result = add_task(tasks, "Buy milk")
        self.assertEqual(tasks, [{"title": "Buy milk", "done": False}])
        self.assertIs(result, tasks[0])
        self.assertIs(result["done"], False)

    def test_add_preserves_existing_tasks(self):
        tasks = [{"title": "A", "done": True}]
        add_task(tasks, "B")
        self.assertEqual(len(tasks), 2)
        self.assertEqual(tasks[0], {"title": "A", "done": True})
        self.assertEqual(tasks[1], {"title": "B", "done": False})

    def test_title_is_stripped(self):
        tasks = []
        add_task(tasks, "  Write tests  ")
        self.assertEqual(tasks[0]["title"], "Write tests")

    def test_empty_title_rejected(self):
        tasks = [{"title": "A", "done": False}]
        with self.assertRaises(ValueError):
            add_task(tasks, "")
        self.assertEqual(tasks, [{"title": "A", "done": False}])

    def test_whitespace_only_title_rejected(self):
        tasks = [{"title": "A", "done": False}]
        with self.assertRaises(ValueError):
            add_task(tasks, "   ")
        self.assertEqual(tasks, [{"title": "A", "done": False}])


class TestCompleteTask(unittest.TestCase):
    def test_complete_pending_task(self):
        tasks = [
            {"title": "A", "done": False},
            {"title": "B", "done": False},
        ]
        result = complete_task(tasks, 1)
        self.assertIs(tasks[1]["done"], True)
        self.assertIs(tasks[0]["done"], False)
        self.assertIs(result, tasks[1])

    def test_complete_is_idempotent(self):
        tasks = [{"title": "A", "done": True}]
        complete_task(tasks, 0)
        self.assertIs(tasks[0]["done"], True)

    def test_out_of_range_index_rejected(self):
        tasks = [{"title": "A", "done": False}]
        with self.assertRaises(IndexError):
            complete_task(tasks, 1)
        with self.assertRaises(IndexError):
            complete_task(tasks, -2)
        self.assertEqual(tasks, [{"title": "A", "done": False}])

    def test_non_integer_index_rejected(self):
        tasks = [{"title": "A", "done": False}]
        for index in ("0", True, 1.0):
            with self.assertRaises(TypeError):
                complete_task(tasks, index)
        self.assertEqual(tasks, [{"title": "A", "done": False}])


class TestScope(unittest.TestCase):
    def test_module_exports_only_the_two_functions(self):
        import task_tracker

        public = [name for name in dir(task_tracker) if not name.startswith("_")]
        self.assertEqual(sorted(public), ["add_task", "complete_task"])
        self.assertTrue(callable(task_tracker.add_task))
        self.assertTrue(callable(task_tracker.complete_task))


if __name__ == "__main__":
    unittest.main()
