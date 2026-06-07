-- AlterTable
ALTER TABLE "workforce"."attendance_logs" ALTER COLUMN "hoursWorked" DROP NOT NULL;

-- AlterTable
ALTER TABLE "workforce"."attendance_logs" ADD COLUMN "startedAt" TIMESTAMP(3),
ADD COLUMN "endedAt" TIMESTAMP(3);
