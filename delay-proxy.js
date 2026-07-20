import http from "node:http";

const DELAY = Number(process.env.DELAY_MS ?? 2000);
const TARGET = new URL(
  process.env.TARGET ?? "http://host.docker.internal:4321",
);

http
  .createServer((req, res) => {
    setTimeout(() => {
      const headers = {
        ...req.headers,
        // host: TARGET.host // if you override the host header, Astro will reject the request because of checkOrigin: true
      };
      // Log exactly what you're about to send upstream
      console.log("=== outgoing request to Astro ===");
      console.log(`${req.method} ${req.url}`);
      console.log(headers);
      console.log("==================================");

      const upstream = http.request(
        {
          hostname: TARGET.hostname,
          port: TARGET.port || 80,
          path: req.url,
          method: req.method,
          headers: headers,
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

console.log(`delay-proxy: ${DELAY}ms → ${TARGET.href}`);
