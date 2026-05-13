-- Task submissions (contributor deliverables) + enum for review workflow
CREATE TYPE "project"."TaskSubmissionStatus" AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'ACCEPTED',
  'REJECTED',
  'CHANGES_REQUESTED'
);

CREATE TABLE "project"."task_submissions" (
  "id" TEXT NOT NULL,
  "task_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "submitted_by_id" TEXT NOT NULL,
  "body" TEXT NOT NULL DEFAULT '',
  "attachments" JSONB,
  "status" "project"."TaskSubmissionStatus" NOT NULL DEFAULT 'DRAFT',
  "submitted_at" TIMESTAMP(3),
  "reviewed_at" TIMESTAMP(3),
  "reviewed_by_id" TEXT,
  "review_note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "task_submissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "task_submissions_task_id_version_key" ON "project"."task_submissions"("task_id", "version");
CREATE INDEX "task_submissions_task_id_status_idx" ON "project"."task_submissions"("task_id", "status");

ALTER TABLE "project"."task_submissions"
  ADD CONSTRAINT "task_submissions_task_id_fkey"
  FOREIGN KEY ("task_id") REFERENCES "project"."tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Normalize legacy dependency type strings to FS/SS/FF/SF codes
UPDATE "project"."task_dependencies"
SET "type" = 'FS'
WHERE "type" IS NULL OR trim("type") = '';

UPDATE "project"."task_dependencies"
SET "type" = CASE lower(trim("type"))
  WHEN 'fs' THEN 'FS'
  WHEN 'finish-to-start' THEN 'FS'
  WHEN 'finishtostart' THEN 'FS'
  WHEN 'ss' THEN 'SS'
  WHEN 'start-to-start' THEN 'SS'
  WHEN 'starttostart' THEN 'SS'
  WHEN 'ff' THEN 'FF'
  WHEN 'finish-to-finish' THEN 'FF'
  WHEN 'finishtofinish' THEN 'FF'
  WHEN 'sf' THEN 'SF'
  WHEN 'start-to-finish' THEN 'SF'
  WHEN 'starttofinish' THEN 'SF'
  ELSE 'FS'
END;
