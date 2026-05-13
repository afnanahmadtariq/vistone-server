-- CreateTable
CREATE TABLE "workforce"."attendance_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "work_date" DATE NOT NULL,
    "hours_worked" DECIMAL(6,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "attendance_logs_organization_id_work_date_idx" ON "workforce"."attendance_logs"("organization_id", "work_date");
CREATE INDEX "attendance_logs_organization_id_user_id_work_date_idx" ON "workforce"."attendance_logs"("organization_id", "user_id", "work_date");
