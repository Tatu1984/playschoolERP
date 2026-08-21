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
import type { Scope } from "@/backend/utils/scope.util";
import type { Session } from "@/backend/utils/route.util";
import type { AuditEntry } from "@/shared/types/ops.types";
import { ROLES, type Role } from "@/shared/constants/roles";
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
          // A SUPER_ADMIN has no branch, and their actions genuinely are not
          // one campus's business — those entries stay unbranched and only
          // SUPER_ADMIN reads them.
          branchId: session.branchId,
        },
      });
    } catch (e) {
      logger.error("Audit write failed", e, { action: input.action });
    }
  },

  /**
   * The trail this login is entitled to read.
   *
   * This took a `Scope` last, not first: it listed every entry to whoever
   * asked, so an admin at one campus read the other campus's trail — who
   * enrolled which child, which invoice was written off, which parent was
   * messaged. The audit trail is the one table whose whole purpose is to be
   * read by someone in authority, which made it easy to forget it also has to
   * answer *which* authority.
   *
   * SUPER_ADMIN sees everything, including the unbranched entries. An ADMIN
   * sees their own branch and nothing else — not even the null-branch rows,
   * which are either a SUPER_ADMIN acting globally or predate the column.
   */
  async list(scope: Scope, limit = 200): Promise<AuditEntry[]> {
    if (scope.role !== ROLES.SUPER_ADMIN && !scope.branchId) {
      // An admin with no branch is not an admin of all branches. Matching on
      // `branchId: null` would have handed them precisely the entries reserved
      // for SUPER_ADMIN.
      return [];
    }
    const rows = await prisma.auditEntry.findMany({
      where: scope.role === ROLES.SUPER_ADMIN ? {} : { branchId: scope.branchId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(toAuditEntry);
  },
};
