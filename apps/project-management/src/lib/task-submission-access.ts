import type { Request } from "express";
import type { RequestWithInternalUser } from "@vistone-server/shared-internal-auth";

export function getInternalUser(req: Request): RequestWithInternalUser["internalUser"] {
  return (req as RequestWithInternalUser).internalUser;
}

export function isOrganizerOrManagerRole(role: string | undefined): boolean {
  const r = (role || "").toLowerCase();
  return r === "organizer" || r === "manager";
}
