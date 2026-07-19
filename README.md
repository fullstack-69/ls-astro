# Run the project

pnpm run preview -- --host

# Clear nginx cache

`docker compose exec cdn-edge sh -c "rm -rf /var/cache/nginx/*"`

# Nginx caching gotchas

## `proxy_ignore_headers Cache-Control Expires;`

Tells nginx to **stop honoring the origin's caching directives** so nginx applies its own `proxy_cache_valid` rule instead.

### Why we need it

Astro's SSR responses come back with:

```

Cache-Control: public, max-age=0

```

`max-age=0` means "treat as stale immediately; revalidate before reuse." nginx's default behavior is to **refuse to store** any response with `max-age=0` (also `no-cache`, `no-store`, `private`, or a past `Expires`). Result: every request is a `MISS` and nothing ever caches.

### What the directive does

`proxy_ignore_headers Cache-Control Expires;` makes nginx **ignore** those two headers from the upstream. With the origin's veto removed, our own directive takes over:

```nginx
proxy_cache_valid 200 10m;   # cache 200 responses for 10 minutes
```

So the response gets stored for 10 minutes regardless of what the origin said.

### The tradeoff

This is the **edge overriding the origin**. Astro said "revalidate every time"; nginx (our mock CDN) decides "I'll serve this for 10 minutes." That's a real lever CDNs expose — and a real responsibility: we may now serve content **staler than the origin intended**. Fine for this static `Greeting` demo; on a page with live/personalized data it would ship a bug.

### Related gotcha

If the origin also sends `Set-Cookie` (e.g. Astro sessions), nginx won't cache either. Adding `Set-Cookie` to the ignore list forces caching, but the stored copy keeps that header — so **every visitor gets one user's cookie** on a `HIT`. If you ignore `Set-Cookie`, also hide it:

```nginx
proxy_ignore_headers Set-Cookie Cache-Control Expires;
proxy_hide_header Set-Cookie;
```

> **Rule of thumb:** ignoring cache headers is safe only when you also strip whatever made the response personalized — and only when the page doesn't actually depend on it.

# Incident Report

**Title:** Astro hydration failure caused by server-only file system module leaking into client bundle

**Date:** 2026-07-20

## Summary

The page failed to hydrate the Todo island because a server-only dependency was pulled into client-side code. During hydration, Astro reported that `node:fs/promises` had been externalized for browser compatibility, and the browser then tried to access `mkdir` from that module.

## User Impact

- The Todo component did not hydrate correctly.
- The page likely rendered with missing or non-interactive Todo behavior.
- The failure occurred at page load during client hydration.

## Error

> [astro-island] Error hydrating Todo.tsx  
> Error: Module "node:fs/promises" has been externalized for browser compatibility. Cannot access "node:fs/promises.mkdir" in client code.

## Likely Cause

The client component appears to be reaching server-only database code indirectly through the action layer. The current action module in index.ts imports `getTodos` from index.ts, and that DB module likely depends on `node:fs/promises` to read or write the local JSON file.

If that import chain is exposed to the client bundle, Astro/Vite will reject it because `node:fs/promises` cannot run in browser code.

## Reproduction

1. Open the page containing the Todo island.
2. Let the component hydrate in the browser.
3. Observe the hydration error in the console and the Todo island failing to initialize.

## Recommended Fix

- Keep all file system access fully server-side.
- Ensure the Todo client component calls only an Astro action or API boundary.
- Move any shared types into a neutral module so the client does not import the DB implementation directly.
- Verify that Todo.tsx imports only browser-safe code.

## Status

Open. The issue is reproducible and points to a server/client boundary problem rather than a browser runtime bug.

If you want, I can also turn this into a ready-to-commit incident file such as incident-2026-07-20.md.
