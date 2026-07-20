import { client } from "./client.ts";
import { ensureTodosTable } from "./schema.ts";
import { type Todo } from "@/types/todo";

function toTodo(row: Record<string, unknown>): Todo {
  return {
    id: Number(row.id),
    todoText: String(row.todoText),
  };
}

export async function getTodos() {
  await ensureTodosTable();

  const result = await client.execute(
    "SELECT id, todoText FROM todos ORDER BY rowid ASC",
  );

  return result.rows.map((row) => toTodo(row as Record<string, unknown>));
}

export async function createTodos(todoText: string) {
  if (!todoText.trim()) {
    throw new Error("Empty Text");
  }

  await ensureTodosTable();

  await client.execute({
    sql: "INSERT INTO todos (todoText) VALUES (?)",
    args: [todoText],
  });
}

export async function deleteTodo(id: number) {
  await ensureTodosTable();

  await client.execute({
    sql: "DELETE FROM todos WHERE id = ?",
    args: [id],
  });
}

export async function searchTodo(id: number) {
  await ensureTodosTable();

  const result = await client.execute({
    sql: "SELECT id, todoText FROM todos WHERE id = ? LIMIT 1",
    args: [id],
  });

  const row = result.rows[0];
  return row ? toTodo(row as Record<string, unknown>) : undefined;
}

export async function updateTodo(id: number, todoTextUpdated: string) {
  if (!todoTextUpdated.trim()) {
    throw new Error("Empty Text");
  }

  await ensureTodosTable();

  const result = await client.execute({
    sql: "UPDATE todos SET todoText = ? WHERE id = ?",
    args: [todoTextUpdated, id],
  });

  if (result.rowsAffected === 0) {
    throw new Error("Invalid Todo ID");
  }
}
