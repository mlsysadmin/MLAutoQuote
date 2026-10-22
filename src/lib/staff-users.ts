import type { Role } from "@prisma/client";

/**
 * Staff roles, described in the terms the person granting them thinks in.
 *
 * Kept beside the role enum rather than inside a component, so the admin
 * screen and any future permission check read from one list.
 */
export const ROLE_OPTIONS: Array<{
  value: Role;
  label: string;
  description: string;
}> = [
  {
    value: "VIEWER",
    label: "Viewer",
    description:
      "Read the queue, the customer registry and the dashboard. Changes nothing.",
  },
  {
    value: "APPRAISER",
    label: "Appraiser",
    description:
      "Everything a viewer can, plus adjusting offers and releasing them to customers.",
  },
  {
    value: "ADMIN",
    label: "Administrator",
    description:
      "Everything an appraiser can, plus creating and suspending staff accounts.",
  },
];

export const ROLE_LABELS: Record<Role, string> = {
  VIEWER: "Viewer",
  APPRAISER: "Appraiser",
  ADMIN: "Administrator",
};

/**
 * The house development password. New accounts get it unless an administrator
 * types one, and the screen says so plainly rather than implying the account is
 * protected.
 */
export const DEFAULT_STAFF_PASSWORD = "1234567890";
