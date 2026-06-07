import { z } from "zod";

const dependencyType = z.enum(["FS", "SS", "FF", "SF"]);

export const milestoneDependencySchema = z.object({
  body: z.object({
    milestoneId: z.string().min(1),
    dependsOnId: z.string().min(1),
    type: dependencyType.optional(),
  }),
});

export const replaceMilestoneDependenciesSchema = z.object({
  body: z.object({
    milestoneId: z.string().min(1),
    dependsOnIds: z.array(z.string().min(1)),
  }),
});
