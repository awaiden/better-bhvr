import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { type AuthVariables, requireAuth, requireRole } from "../../middleware/auth";
import { updateUserRoleSchema, userIdParamSchema } from "./users.schema";
import { usersService } from "./users.service";

export const userRoutes = new Hono<{ Variables: AuthVariables }>()
  .use("*", requireAuth)
  .get("/", (c) => {
    return c.json({ user: c.get("user") });
  });

export const adminUserRoutes = new Hono<{ Variables: AuthVariables }>()
  .use("*", requireAuth, requireRole("admin"))
  .get("/", async (c) => {
    const users = await usersService.listUsers();
    return c.json({ users });
  })
  .patch(
    "/:id/role",
    zValidator("param", userIdParamSchema),
    zValidator("json", updateUserRoleSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const { role } = c.req.valid("json");
      const user = await usersService.updateRole(id, role);
      return c.json({ user });
    },
  );
