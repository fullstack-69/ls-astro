import { client } from "./client.ts";

const CREATE_TODOS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    todoText TEXT NOT NULL
  )
`;

let schemaReady: Promise<void> | undefined;

export function ensureTodosTable() {
  if (!schemaReady) {
    schemaReady = client.execute(CREATE_TODOS_TABLE_SQL).then(() => undefined);
  }

  return schemaReady;
}
