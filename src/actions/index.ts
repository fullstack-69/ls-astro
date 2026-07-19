import { defineAction } from "astro:actions";
import { getTodos } from "../db/index.ts";
import { z } from "astro/zod";

export const server = {
  getTodos: defineAction({
    handler: async () => {
      return await getTodos();
    },
  }),
};
