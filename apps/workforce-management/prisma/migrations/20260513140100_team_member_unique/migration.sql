-- One roster row per user per team (manager is canonical on teams.manager_id).
DELETE FROM "workforce"."team_members" a
USING "workforce"."team_members" b
WHERE a."team_id" = b."team_id"
  AND a."user_id" = b."user_id"
  AND (
    a."created_at" > b."created_at"
    OR (a."created_at" = b."created_at" AND a."id"::text > b."id"::text)
  );

CREATE UNIQUE INDEX "team_members_team_id_user_id_key" ON "workforce"."team_members" ("team_id", "user_id");
