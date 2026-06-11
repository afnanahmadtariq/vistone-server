ALTER TABLE "auth"."mfa_settings" ADD COLUMN IF NOT EXISTS "emailMfaEnabled" BOOLEAN NOT NULL DEFAULT true;
