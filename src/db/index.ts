import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { type Todo } from "@/types/todo";

// Mock DB persisted in a JSON file. Replace this with a real DB in production.

const DB_LATENCY = 2000; // ms
const DB_FILE_PATH = path.join(process.cwd(), "src", "db", "todos.json");

const DEFAULT_TODOS: Todo[] = [
  {
    id: "123456",
    todoText: "My First Todo",
  },
];

let writeQueue: Promise<void> = Promise.resolve();

function genId() {
  return new Date().getTime().toString().slice(-6);
}

export async function getTodos() {
  await sleep(DB_LATENCY);
  return readTodosFromFile();
}

export async function createTodos(todoText: string) {
  await sleep(DB_LATENCY);
  if (!todoText.trim()) {
    throw new Error("Empty Text");
  }

  await withWriteLock(async (todos) => {
    todos.push({
      id: genId(),
      todoText,
    });
  });
}

export async function deleteTodo(id: string) {
  await sleep(DB_LATENCY);
  await withWriteLock(async (todos) => {
    const filtered = todos.filter((el) => el.id !== id);
    todos.splice(0, todos.length, ...filtered);
  });
}

export async function searchTodo(id: string) {
  await sleep(DB_LATENCY);
  const todos = await readTodosFromFile();
  const todo = todos.find((el) => el.id === id);
  return todo;
}

export async function updateTodo(id: string, todoTextUpdated: string) {
  await sleep(DB_LATENCY);
  if (!todoTextUpdated.trim()) {
    throw new Error("Empty Text");
  }

  await withWriteLock(async (todos) => {
    const idx = todos.findIndex((el) => el.id === id);
    if (idx > -1) {
      todos[idx].todoText = todoTextUpdated;
      return;
    }
    throw new Error("Invalid Todo ID");
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureDbFile() {
  const dir = path.dirname(DB_FILE_PATH);
  await mkdir(dir, { recursive: true });

  try {
    await readFile(DB_FILE_PATH, "utf-8");
  } catch {
    await writeFile(
      DB_FILE_PATH,
      JSON.stringify(DEFAULT_TODOS, null, 2),
      "utf-8",
    );
  }
}

async function readTodosFromFile(): Promise<Todo[]> {
  await ensureDbFile();

  const raw = await readFile(DB_FILE_PATH, "utf-8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("Invalid todos JSON format");
  }

  return parsed;
}

async function writeTodosToFile(todos: Todo[]) {
  await writeFile(DB_FILE_PATH, JSON.stringify(todos, null, 2), "utf-8");
}

async function withWriteLock<T>(
  operation: (todos: Todo[]) => Promise<T> | T,
): Promise<T> {
  const run = writeQueue.then(async () => {
    const todos = await readTodosFromFile();
    const result = await operation(todos);
    await writeTodosToFile(todos);
    return result;
  });

  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );

  return run;
}
