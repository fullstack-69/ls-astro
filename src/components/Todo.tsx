import { useState, useEffect, type FC } from "react";
import { actions } from "astro:actions";
import { withState } from "@astrojs/react/actions";
import { type Todo } from "@/types/todo";

const TodoReact: FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchTodos = async () => {
    setLoading(true);
    const { data, error } = await actions.getTodos();
    if (error) {
      console.error("Error fetching todos:", error);
      return;
    }
    setTodos(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  return (
    <article>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "1rem",
        }}
      >
        <h1 style={{ margin: 0 }}>Todos</h1>
        {loading ? <span aria-busy="true"></span> : null}
      </div>

      <TodoList
        todos={todos}
        refetch={fetchTodos}
        setLoading={setLoading}
        loading={loading}
      />
    </article>
  );
};

export default TodoReact;

interface TodoListProps {
  todos: Todo[];
  refetch: () => void;
  setLoading: (loading: boolean) => void;
  loading: boolean;
}

const TodoList: FC<TodoListProps> = ({
  todos,
  refetch,
  setLoading,
  loading,
}) => {
  return (
    <>
      {todos.map((todo, _) => {
        return (
          <article
            key={todo.id}
            className="grid"
            style={{
              alignItems: "center",
              gridTemplateColumns: "0.5fr 4fr 1fr",
              opacity: loading ? 0.5 : 1,
            }}
          >
            <span>({todo.id})</span>
            <span>✍️ {todo.todoText}</span>
            <ButtonDelete
              todo={todo}
              refetch={refetch}
              setLoading={setLoading}
              loading={loading}
            />
          </article>
        );
      })}
    </>
  );
};

interface ButtonDeleteProps {
  todo: Todo;
  refetch: () => void;
  setLoading: (loading: boolean) => void;
  loading: boolean;
}

const ButtonDelete: FC<ButtonDeleteProps> = ({
  todo,
  refetch,
  setLoading,
  loading,
}) => {
  async function handleClick() {
    setLoading(true);
    const { data, error } = await actions.deleteTodo({ id: todo.id });
    setLoading(false);
    if (error) {
      console.error("Error deleting todo:", error);
      return;
    }
    refetch();
  }

  return loading ? (
    <div style={{ cursor: "not-allowed" }}>🗑️</div>
  ) : (
    <div onClick={handleClick} style={{ cursor: "pointer" }}>
      🗑️
    </div>
  );
};
