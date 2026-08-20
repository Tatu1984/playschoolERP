import type { Role } from "../constants/roles";

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
