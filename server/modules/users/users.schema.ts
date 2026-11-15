import { z } from "zod";

export const userRoleSchema = z.enum(["user", "admin"]);

export const userIdParamSchema = z.object({
  id: z.string().trim().min(1, "User ID is required"),
});

export const updateUserRoleSchema = z.object({
  role: userRoleSchema,
});

export type UserRoleInput = z.infer<typeof userRoleSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
