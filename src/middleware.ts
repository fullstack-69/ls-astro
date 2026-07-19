import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
  // No longer simulate waiting here since I am using "delay-proxy" server instead.
  // await new Promise((r) => setTimeout(r, 2000));
  return next();
});
