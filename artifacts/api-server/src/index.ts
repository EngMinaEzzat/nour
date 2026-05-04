import http from "http";
import net from "net";
import app from "./app";
import { logger } from "./lib/logger";
import { startScheduler } from "./lib/scheduler.js";

const rawPort = process.env["PORT"];
const startPort =
  rawPort && !Number.isNaN(Number(rawPort)) && Number(rawPort) > 0
    ? Number(rawPort)
    : 8080;

const server = http.createServer(app);

// ─── Dev: proxy WebSocket upgrade requests to the Vite HMR server ────────────
if (process.env.NODE_ENV !== "production") {
  const VITE_PORT = Number(process.env.VITE_PORT ?? 25935);

  server.on("upgrade", (req, socket, head) => {
    const target = net.connect(VITE_PORT, "127.0.0.1", () => {
      const headers = [
        `${req.method ?? "GET"} ${req.url} HTTP/1.1`,
        `Host: localhost:${VITE_PORT}`,
        ...Object.entries(req.headers)
          .filter(([k]) => k !== "host")
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`),
        "",
        "",
      ].join("\r\n");

      target.write(headers);
      if (head && head.length > 0) target.write(head);
    });

    target.on("error", () => socket.destroy());
    socket.on("error", () => target.destroy());
    socket.pipe(target);
    target.pipe(socket);
  });
}

// ─── Port probe: find the first available port starting from startPort ────────
// Uses a lightweight net.Server probe so we only call server.listen() once
// with a port we know is free — avoids the multiple-listener bug that arises
// from calling http.Server.listen() several times on the same instance.
function probePort(port: number): Promise<number> {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once("error", () => resolve(probePort(port + 1)));
    probe.listen(port, "0.0.0.0", () => {
      probe.close(() => resolve(port));
    });
  });
}

probePort(startPort).then((port) => {
  if (port !== startPort) {
    logger.warn({ startPort, port }, "Requested port busy — using next available port");
  }

  server.listen(port, () => {
    logger.info({ port }, "Server listening");
    startScheduler();
  });

  server.on("error", (err) => {
    logger.error({ err }, "Unexpected server error");
    process.exit(1);
  });
});
