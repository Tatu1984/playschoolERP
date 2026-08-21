/**
 * The admin audit trail (/admin/audit). Every state-changing admin action calls
 * `record` — a school handling children's data should be able to answer "who
 * changed this, and when" without reading application logs.
 *
 * Writes are deliberately best-effort: an audit failure must never roll back
 * the thing the user actually asked for, but it must be loud in the server log.
 */
import { prisma } from "@/backend/database/client";
import { toAuditEntry } from "@/backend/mappers";
import type { Session } from "@/backend/utils/route.util";
import type { AuditEntry } from "@/shared/types/ops.types";
import type { Role } from "@/shared/constants/roles";
import { logger } from "@/backend/utils/logger.util";

export interface AuditInput {
  action: string;
  target?: string;
  detail?: string;
  ip?: string;
}

export const auditService = {
  async record(session: Session, input: AuditInput): Promise<void> {
    try {
      await prisma.auditEntry.create({
        data: {
          actorName: session.name,
          actorRole: session.role as Role,
          action: input.action,
          target: input.target ?? "",
          detail: input.detail ?? "",
          ip: input.ip ?? "",
        },
      });
    } catch (e) {
      logger.error("Audit write failed", e, { action: input.action });
    }
  },

  async list(limit = 200): Promise<AuditEntry[]> {
    const rows = await prisma.auditEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(toAuditEntry);
  },
};
