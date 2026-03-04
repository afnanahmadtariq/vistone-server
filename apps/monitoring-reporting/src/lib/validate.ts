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

      req.body = (parsed as any).body;
      req.query = (parsed as any).query;
      req.params = (parsed as any).params;

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
