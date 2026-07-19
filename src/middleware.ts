import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
  await new Promise((r) => setTimeout(r, 2000));
  return next();
});
