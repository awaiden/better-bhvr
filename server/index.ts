import { Hono } from "hono";
import { auth } from "./auth";
import { errorHandler } from "./common/errors";
import { rateLimit } from "./middleware/rate-limit";
import { taskRoutes } from "./modules/tasks/tasks.routes";
import { adminUserRoutes, userRoutes } from "./modules/users/users.routes";

const api = new Hono()
  .basePath("/api")
  .use("*", rateLimit())
  .get("/health", (c) => {
    return c.json({ ok: true });
  })
  .get("/hello", (c) => {
    return c.json({ message: "Hello from Hono!" });
  })
  .route("/me", userRoutes)
  .route("/tasks", taskRoutes)
  .route("/users", adminUserRoutes);

const app = new Hono()
  .onError(errorHandler)
  .on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw))
  .route("/", api)
  .all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

if ("Bun" in globalThis) {
  const { serveStatic } = await import("hono/bun");
  app.use("*", serveStatic({ root: "./dist" }));
  app.get("*", serveStatic({ path: "./dist/index.html" }));
}

export type AppType = typeof api;
export default app;
