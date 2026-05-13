-- Clients are always scoped to an organization.
DELETE FROM "client"."clients" WHERE "organization_id" IS NULL;

ALTER TABLE "client"."clients" ALTER COLUMN "organization_id" SET NOT NULL;
