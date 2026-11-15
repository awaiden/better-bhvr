import { z } from "zod";

export {
  createTaskSchema,
  updateTaskSchema,
  type CreateTaskInput,
  type UpdateTaskInput,
} from "../../../shared/schemas";

export const taskIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
