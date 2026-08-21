import { prisma } from "@/backend/database/client";
import type { Role } from "@/shared/constants/roles";

export const authRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  },

  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  /**
   * The two things a session is re-checked against on every request. Narrow on
   * purpose: this runs constantly, and it has no business loading a password
   * hash to answer "is this account still enabled?".
   */
  findSessionState(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: { active: true, sessionsValidFrom: true },
    });
  },

  setSessionsValidFrom(id: string, at: Date) {
    return prisma.user.update({ where: { id }, data: { sessionsValidFrom: at } });
  },

  create(data: {
    email: string;
    passwordHash: string;
    name: string;
    phone?: string | null;
    role?: Role;
    branchId?: string | null;
  }) {
    return prisma.user.create({
      data: { ...data, email: data.email.toLowerCase() },
    });
  },
};
