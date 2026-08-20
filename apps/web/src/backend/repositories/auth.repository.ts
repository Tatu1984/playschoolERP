import { prisma } from "@/backend/database/client";
import type { Role } from "@/shared/constants/roles";

export const authRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  },

  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
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
