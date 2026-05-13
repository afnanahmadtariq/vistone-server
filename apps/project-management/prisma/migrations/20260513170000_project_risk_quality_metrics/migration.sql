CREATE TABLE "project"."project_risk_quality_metrics" (
  "id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "inputs" JSONB NOT NULL DEFAULT '{}',
  "computed" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "project_risk_quality_metrics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "project_risk_quality_metrics_project_id_key"
  ON "project"."project_risk_quality_metrics"("project_id");

ALTER TABLE "project"."project_risk_quality_metrics"
  ADD CONSTRAINT "project_risk_quality_metrics_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "project"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
