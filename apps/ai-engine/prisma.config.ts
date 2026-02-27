import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use DATABASE_URL if available, otherwise use a dummy URL for client generation
    url: process.env.DATABASE_URL || "postgresql://dummy:dummy@localhost:5432/dummy",
  },
});
