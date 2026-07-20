import { client } from "./client.ts";
import { ensureTodosTable } from "./schema.ts";

// prettier-ignore
const todoList = [
  { id: 1, task: "Refactor user authentication middleware", completed: false },
  { id: 2, task: "Fix memory leak in web socket connection", completed: true },
  { id: 3, task: "Optimize database indexes for query speed", completed: false },
  { id: 4, task: "Update React dependencies to latest versions", completed: false },
  { id: 5, task: "Implement dark mode styling in Tailwind", completed: true },
  { id: 6, task: "Write unit tests for checkout processing", completed: false },
  { id: 7, task: "Set up automatic daily database backups", completed: false },
  { id: 8, task: "Renew SSL certificate for production API", completed: true },
  { id: 9, task: "Sanitize user inputs on contact form", completed: false },
  { id: 10, task: "Integrate Stripe payment webhook handlers", completed: false },
  { id: 11, task: "Compress high-resolution image assets", completed: true },
  { id: 12, task: "Configure Redis caching for hot endpoints", completed: false },
  { id: 13, task: "Audit accessibility tags on landing page", completed: false },
  { id: 14, task: "Fix broken redirect links in navigation", completed: true },
  { id: 15, task: "Add rate limiting to login endpoint", completed: false },
  { id: 16, task: "Setup Docker container for local staging", completed: false },
  { id: 17, task: "Migrate legacy CSS styles to CSS modules", completed: true },
  { id: 18, task: "Implement infinite scroll for search results", completed: false },
  { id: 19, task: "Translate application interface text to Spanish", completed: false },
  { id: 20, task: "Review open pull requests from interns", completed: true }
];

async function seed() {
  const seedCount = 20;
  const insertStatements = Array.from({ length: seedCount }, (_, index) => ({
    sql: "INSERT INTO todos (todoText) VALUES (?)",
    args: [todoList[index].task],
  }));

  await ensureTodosTable();

  await client.batch(
    [
      {
        sql: "DELETE FROM todos",
      },
      ...insertStatements,
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
