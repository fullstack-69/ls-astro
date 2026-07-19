import { useState, useEffect, type FC } from "react";
import { actions } from "astro:actions";
import { type Todo } from "@/types/todo";

const TodoReact: FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);

  const fetchTodos = async () => {
    const { data, error } = await actions.getTodos();
    if (error) {
      console.error("Error fetching todos:", error);
      return;
    }
    console.log("Fetched todos:", data);
    setTodos(data);
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  return (
    <>
      <h1>Todo</h1>
      <TodoList todos={todos} />
    </>
  );
};

export default TodoReact;

interface Props {
  todos: Todo[];
}

const TodoList: FC<Props> = ({ todos }) => {
  return (
    <>
      {todos.map((todo, idx) => {
        // const fontStyle = todo.id === curTodo.id ? "700" : "400";
        // const fontClass = todo.id === curTodo.id ? "pico-color-blue-400" : "";

        return (
          <article
            key={todo.id}
            className="grid"
            style={{
              alignItems: "center",
              gridTemplateColumns: "0.5fr 4fr 1fr 1fr",
            }}
          >
            <span>({idx + 1})</span>
            {/* <span style={{ fontWeight: fontStyle }} className={fontClass}> */}
            <span>✍️ {todo.todoText}</span>
            {/* <ButtonDelete todo={todo} />
            <ButtonUpdate todo={todo} /> */}
          </article>
        );
      })}
    </>
  );
};
