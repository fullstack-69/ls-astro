import { client } from "./client.ts";
import { ensureTodosTable } from "./schema.ts";

async function seed() {
  await ensureTodosTable();

  await client.batch(
    [
      {
        sql: "DELETE FROM todos",
      },
      {
        sql: "INSERT INTO todos (todoText) VALUES (?)",
        args: ["My First Todo"],
      },
      {
        sql: "INSERT INTO todos (todoText) VALUES (?)",
        args: ["My Second Todo"],
      },
      {
        sql: "INSERT INTO todos (todoText) VALUES (?)",
        args: ["My Third Todo"],
      },
    ],
    "write",
  );

  const result = await client.execute("SELECT * FROM todos ORDER BY rowid ASC");
  console.log(result.rows);
  client.close();
}

seed().catch((error) => {
  console.error(error);
  client.close();
  process.exitCode = 1;
});
