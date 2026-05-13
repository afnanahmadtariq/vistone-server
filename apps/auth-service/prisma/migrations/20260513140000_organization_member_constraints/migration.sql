-- Organization membership rules:
-- - member_kind enum (aligned with internal roles + Client)
-- - at most one membership row per user (single-organization scope)
-- - at most one ORGANIZER member per organization (partial unique index)

CREATE TYPE "auth"."OrganizationMemberKind" AS ENUM ('ORGANIZER', 'MANAGER', 'CONTRIBUTOR', 'CLIENT');

ALTER TABLE "auth"."organization_members" ADD COLUMN "member_kind" "auth"."OrganizationMemberKind" NOT NULL DEFAULT 'CONTRIBUTOR';

-- Normalize duplicate rows before adding uniques
DELETE FROM "auth"."organization_members" om
WHERE om."id" IN (
  SELECT "id" FROM (
    SELECT "id",
           ROW_NUMBER() OVER (PARTITION BY "organization_id", "user_id" ORDER BY "created_at") AS rn
    FROM "auth"."organization_members"
  ) t WHERE rn > 1
);

DELETE FROM "auth"."organization_members" om
WHERE om."id" IN (
  SELECT "id" FROM (
    SELECT "id",
           ROW_NUMBER() OVER (PARTITION BY "user_id" ORDER BY "created_at") AS rn
    FROM "auth"."organization_members"
  ) t WHERE rn > 1
);

UPDATE "auth"."organization_members" om
SET "member_kind" = CASE lower(r."name")
  WHEN 'organizer' THEN 'ORGANIZER'::"auth"."OrganizationMemberKind"
  WHEN 'manager' THEN 'MANAGER'::"auth"."OrganizationMemberKind"
  WHEN 'contributor' THEN 'CONTRIBUTOR'::"auth"."OrganizationMemberKind"
  WHEN 'client' THEN 'CLIENT'::"auth"."OrganizationMemberKind"
  ELSE 'CONTRIBUTOR'::"auth"."OrganizationMemberKind"
END
FROM "auth"."roles" r
WHERE om."role_id" IS NOT NULL AND om."role_id" = r."id";

-- Keep a single ORGANIZER row per organization (oldest wins)
UPDATE "auth"."organization_members" om
SET "member_kind" = 'MANAGER'::"auth"."OrganizationMemberKind"
WHERE om."id" IN (
  SELECT "id" FROM (
    SELECT "id", ROW_NUMBER() OVER (PARTITION BY "organization_id" ORDER BY "created_at") AS rn
    FROM "auth"."organization_members"
    WHERE "member_kind" = 'ORGANIZER'
  ) x WHERE rn > 1
);

CREATE UNIQUE INDEX "organization_members_user_id_key" ON "auth"."organization_members" ("user_id");

CREATE UNIQUE INDEX "organization_members_one_organizer_per_org"
  ON "auth"."organization_members" ("organization_id")
  WHERE ("member_kind" = 'ORGANIZER');
