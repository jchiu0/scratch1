def add_task(tasks, title):
    stripped = title.strip()
    if not stripped:
        raise ValueError("title must be a non-empty string")
    task = {"title": stripped, "done": False}
    tasks.append(task)
    return task


def complete_task(tasks, index):
    if not isinstance(index, int) or isinstance(index, bool):
        raise TypeError("index must be an int")
    task = tasks[index]
    task["done"] = True
    return task
