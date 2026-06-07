import { z } from "zod";

/** FS = predecessor finishes → successor starts; SS = starts together; FF = finish together; SF = predecessor starts → successor finishes. */
const dependencyType = z.enum(["FS", "SS", "FF", "SF"]);

export const taskDependencySchema = z.object({
      body: z.object({
        taskId: z.string().min(1),
        dependsOnId: z.string().min(1),
        type: dependencyType,
      })
    });
export const updateTaskDependencySchema = z.object({
      body: taskDependencySchema.shape.body.partial()
    });
