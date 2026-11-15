import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { type AuthVariables, requireAuth } from "../../middleware/auth";
import { createTaskSchema, taskIdParamSchema, updateTaskSchema } from "./tasks.schema";
import { tasksService } from "./tasks.service";

export const taskRoutes = new Hono<{ Variables: AuthVariables }>()
  .use("*", requireAuth)
  .get("/", async (c) => {
    const user = c.get("user");
    const tasks = await tasksService.listByUser(user.id);
    return c.json({ tasks });
  })
  .post("/", zValidator("json", createTaskSchema), async (c) => {
    const user = c.get("user");
    const input = c.req.valid("json");
    const task = await tasksService.create(user.id, input);
    return c.json({ task }, 201);
  })
  .patch(
    "/:id",
    zValidator("param", taskIdParamSchema),
    zValidator("json", updateTaskSchema),
    async (c) => {
      const user = c.get("user");
      const { id } = c.req.valid("param");
      const updates = c.req.valid("json");
      const task = await tasksService.update(user.id, id, updates);
      return c.json({ task });
    },
  )
  .delete("/:id", zValidator("param", taskIdParamSchema), async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    await tasksService.remove(user.id, id);
    return c.json({ ok: true });
  });
