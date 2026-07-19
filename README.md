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
