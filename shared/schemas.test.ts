import { describe, expect, it } from "vite-plus/test";
import { updateTaskSchema } from "./schemas";

describe("updateTaskSchema", () => {
  it("rejects an empty object", () => {
    const result = updateTaskSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("accepts title only", () => {
    const result = updateTaskSchema.safeParse({ title: "Updated task" });
    expect(result.success).toBe(true);
  });

  it("accepts completed only (true or false)", () => {
    expect(updateTaskSchema.safeParse({ completed: true }).success).toBe(true);
    expect(updateTaskSchema.safeParse({ completed: false }).success).toBe(true);
  });

  it("accepts both title and completed", () => {
    const result = updateTaskSchema.safeParse({
      title: "Updated task",
      completed: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty or whitespace-only title", () => {
    expect(updateTaskSchema.safeParse({ title: "   " }).success).toBe(false);
  });
});
