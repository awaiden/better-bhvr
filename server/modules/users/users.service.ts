import { desc, eq } from "drizzle-orm";
import { NotFoundError } from "../../common/errors";
import { db, user } from "../../db";
import type { UserRoleInput } from "./users.schema";

const userPublicColumns = {
  id: user.id,
  name: user.name,
  email: user.email,
  emailVerified: user.emailVerified,
  role: user.role,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
};

/** Pure data-access service for user management. */
export const usersService = {
  async listUsers() {
    return db.select(userPublicColumns).from(user).orderBy(desc(user.createdAt));
  },

  async updateRole(id: string, role: UserRoleInput) {
    const [updated] = await db
      .update(user)
      .set({ role })
      .where(eq(user.id, id))
      .returning(userPublicColumns);

    if (!updated) {
      throw new NotFoundError("User not found");
    }

    return updated;
  },
};
