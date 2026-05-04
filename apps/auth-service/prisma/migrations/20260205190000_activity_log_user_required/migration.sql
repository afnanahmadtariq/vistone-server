-- Activity logs must always attribute an actor (userId non-null).
DELETE FROM auth.activity_logs WHERE "userId" IS NULL;

ALTER TABLE auth.activity_logs ALTER COLUMN "userId" SET NOT NULL;
