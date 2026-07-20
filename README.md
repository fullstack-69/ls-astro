# Setup

## Environment

Create a `.env` file in the project root.

Current keys:

```env
DB_LATENCY=1000
TURSO_DATABASE_URL=file:app.db
```

- `DB_LATENCY`: artificial DB delay in milliseconds for demo/testing behavior.
- `TURSO_DATABASE_URL`: database URL used by `src/db/client.ts`.
  - Use `file:app.db` for local development.
  - Use your Turso URL in remote environments.

If `TURSO_DATABASE_URL` is missing, the app falls back to `file:app.db`.

## Clear Nginx Cache

Manual cache clearing is no longer required in normal flow.

The build script already resets CDN cache automatically:

```bash
pnpm build
```

If you ever need to clear cache manually, use:

```bash
pnpm run cdn:reset
```

# Note 1: Nginx Caching Gotchas

## Directive: `proxy_ignore_headers Cache-Control Expires;`

This tells nginx to **stop honoring the origin's caching directives** so nginx applies its own `proxy_cache_valid` rule instead.

### Why This Is Needed

Astro's SSR responses come back with:

```http
Cache-Control: public, max-age=0
```

`max-age=0` means "treat as stale immediately; revalidate before reuse." nginx's default behavior is to **refuse to store** any response with `max-age=0` (also `no-cache`, `no-store`, `private`, or a past `Expires`). Result: every request is a `MISS` and nothing ever caches.

### What the Directive Does

`proxy_ignore_headers Cache-Control Expires;` makes nginx **ignore** those two headers from the upstream. With the origin's veto removed, this directive takes over:

```nginx
proxy_cache_valid 200 10m;   # cache 200 responses for 10 minutes
```

So the response gets stored for 10 minutes regardless of what the origin said.

### Tradeoff

This is the **edge overriding the origin**. Astro said "revalidate every time"; nginx (our mock CDN) decides "I'll serve this for 10 minutes." That is a real lever CDNs expose and a real responsibility: you may serve content **staler than the origin intended**. Fine for this static `Greeting` demo; on a page with live or personalized data it would ship a bug.

### Related Gotcha

If the origin also sends `Set-Cookie` (for example, Astro sessions), nginx will not cache either. Adding `Set-Cookie` to the ignore list forces caching, but the stored copy keeps that header, so **every visitor gets one user's cookie** on a `HIT`. If you ignore `Set-Cookie`, also hide it:

```nginx
proxy_ignore_headers Set-Cookie Cache-Control Expires;
proxy_hide_header Set-Cookie;
```

> **Rule of thumb:** ignoring cache headers is safe only when you also strip whatever made the response personalized, and only when the page does not actually depend on it.

# Note 2: Astro Hydration Failure from Server-Only Module in Client Bundle

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

The client component appears to be reaching server-only database code indirectly through the action layer. The current action module in `index.ts` imports `getTodos` from `index.ts`, and that DB module likely depends on `node:fs/promises` to read or write the local JSON file.

If that import chain is exposed to the client bundle, Astro/Vite will reject it because `node:fs/promises` cannot run in browser code.

## Reproduction

1. Open the page containing the Todo island.
2. Let the component hydrate in the browser.
3. Observe the hydration error in the console and the Todo island failing to initialize.

## Recommended Fix

- Keep all file system access fully server-side.
- Ensure the Todo client component calls only an Astro action or API boundary.
- Move any shared types into a neutral module so the client does not import the DB implementation directly.
- Verify that `Todo.tsx` imports only browser-safe code.

# Note 3: Fixing `checkOrigin` Failures Behind Nginx -> delay-proxy -> Astro

## Setup

```text
Browser -> nginx (localhost:8080) -> delay-proxy (Node, port 4322) -> Astro dev server (localhost:4321)
```

## Symptom

Astro's CSRF protection (`security.checkOrigin`) rejected form submissions with:

```text
Cross-site POST form submissions are forbidden
```

The only known workaround was disabling the check entirely:

```javascript
// astro.config.mjs
security: {
  checkOrigin: false,
}
```

## Root Cause

`checkOrigin` compares the browser's `Origin` header against the `Host` header Astro receives. Two separate bugs were breaking that match:

1. **nginx dropped the port.** `proxy_set_header Host $host;` uses nginx's `$host` variable, which strips the port from the URL. Browsing to `http://localhost:8080` resulted in `Host: localhost` (no `:8080`) being forwarded.
2. **The delay-proxy overwrote `Host` entirely.** The proxy was setting `headers.host = TARGET.host` (for example, `host.docker.internal:4321`) before forwarding to Astro. That value is the proxy's own connection target, not the domain the visitor typed, so it never matched the browser's `Origin` header regardless of nginx.

**Key insight:** in Node's `http.request()`, the connection target (`hostname` and `port`) and the `Host` header are independent. You can connect to `host.docker.internal:4321` while sending any `Host` header you like. There is no need to overwrite it to reach the upstream server.

## Fixes

### 1. nginx: Preserve the Port

Use `$http_host` (the literal `Host` header the browser sent) instead of `$host` (which strips the port):

```nginx
location / {
    proxy_pass http://delay-proxy:4322;
    proxy_set_header Host $http_host;   # was $host
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

Apply the same change to any other `location` blocks with `proxy_set_header Host $host;`.

### 2. delay-proxy: Stop Overwriting `Host`

```javascript
import http from "node:http";

const DELAY = Number(process.env.DELAY_MS ?? 2000);
const TARGET = new URL(
  process.env.TARGET ?? "http://host.docker.internal:4321",
);

http
  .createServer((req, res) => {
    setTimeout(() => {
      const remoteAddr = req.socket.remoteAddress;
      const existingXff = req.headers["x-forwarded-for"];
      const xff = existingXff ? `${existingXff}, ${remoteAddr}` : remoteAddr;

      const headers = {
        ...req.headers, // Host passes through unchanged (now correct thanks to nginx fix)
        "x-real-ip": remoteAddr,
        "x-forwarded-for": xff,
        "x-forwarded-proto": req.headers["x-forwarded-proto"] ?? "http",
      };

      const upstream = http.request(
        {
          hostname: TARGET.hostname, // connection target, independent of the Host header
          port: TARGET.port || 80,
          path: req.url,
          method: req.method,
          headers,
        },
        (up) => {
          res.writeHead(up.statusCode, up.headers);
          up.pipe(res);
        },
      );
      upstream.on("error", (err) => {
        res.writeHead(502, { "content-type": "text/plain" });
        res.end("delay-proxy: upstream error: " + err.message);
      });
      req.pipe(upstream);
    }, DELAY);
  })
  .listen(4322, "0.0.0.0");

console.log(`delay-proxy: ${DELAY}ms -> ${TARGET.href}`);
```

### 3. Astro: Allowlist Host and Re-enable the Check

```javascript
// astro.config.mjs
export default defineConfig({
  server: {
    allowedHosts: ["localhost:8080"],
  },
  security: {
    checkOrigin: true, // restored, no longer needs to be disabled
  },
});
```

## End-to-End Result

| Hop                                              | `Host` header    |
| ------------------------------------------------ | ---------------- |
| Browser -> nginx                                 | `localhost:8080` |
| nginx -> delay-proxy (`$http_host`)              | `localhost:8080` |
| delay-proxy -> Astro (no longer overwritten)     | `localhost:8080` |
| Compared against `Origin: http://localhost:8080` | match            |

## Debugging Technique Used

Logging outgoing headers right before the proxy sends them to Astro made the `$host` port-stripping bug immediately visible:

```javascript
console.log(
  `${req.method} ${req.url} | Host: ${headers.host} | Origin: ${headers.origin}`,
);
```

Note: the browser only attaches an `Origin` header on unsafe requests (`POST`, `PUT`, `PATCH`, `DELETE` with form-like content types). It is not sent on plain `GET` navigations, so to see it you need to log an actual form submission, not a page load.
