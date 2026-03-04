import { ZodSchema, ZodError } from "zod";
import { Request, Response, NextFunction } from "express";

export const validateRequest =
  (schema: ZodSchema) =>
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const parsed = await schema.parseAsync({
          body: req.body,
          query: req.query,
          params: req.params,
        });

        const result = parsed as Record<string, unknown>;
        if ('body' in result) req.body = result.body;
        if ('query' in result) req.query = result.query as typeof req.query;
        if ('params' in result) req.params = result.params as typeof req.params;

        next();
      } catch (error: unknown) {
        if (error instanceof ZodError) {
          res.status(400).json({
            error: "Validation failed",
            details: error.issues,
          });
        } else {
          res.status(500).json({ error: "Internal server error during validation" });
        }
      }
    };
