import type { Role } from "@/shared/constants/roles";

/** User shape safe to send to the client (no passwordHash). */
export interface SafeUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: Role;
  branchId: string | null;
  active: boolean;
}
