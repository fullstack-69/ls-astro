import { defineAction } from "astro:actions";
import { getTodos, deleteTodo } from "../db/index.ts";
import { z } from "astro/zod";

export const server = {
  getTodos: defineAction({
    handler: async () => {
      return await getTodos();
    },
  }),
  deleteTodo: defineAction({
    input: z.object({
      id: z.number(),
    }),
    handler: async ({ id }) => {
      await deleteTodo(id);
      return null;
    },
  }),
};
