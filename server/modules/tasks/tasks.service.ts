import { and, desc, eq } from "drizzle-orm";
import { NotFoundError } from "../../common/errors";
import { db, tasks } from "../../db";
import type { CreateTaskInput, UpdateTaskInput } from "./tasks.schema";

/** Pure data-access service for user tasks. */
export const tasksService = {
  async listByUser(userId: string) {
    return db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(desc(tasks.createdAt));
  },

  async create(userId: string, input: CreateTaskInput) {
    const [task] = await db.insert(tasks).values({ title: input.title, userId }).returning();
    return task;
  },

  async update(userId: string, id: number, input: UpdateTaskInput) {
    const [task] = await db
      .update(tasks)
      .set(input)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();

    if (!task) {
      throw new NotFoundError("Task not found");
    }

    return task;
  },

  async remove(userId: string, id: number) {
    const [deleted] = await db
      .delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();

    if (!deleted) {
      throw new NotFoundError("Task not found");
    }

    return deleted;
  },
};
