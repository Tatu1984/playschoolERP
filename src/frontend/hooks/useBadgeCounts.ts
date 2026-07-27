"use client";

import { useErpStore } from "@/frontend/store/erpStore";
import { useGuardianId, useSession, useStaffId } from "@/frontend/store/session";
import {
  childrenOfGuardian,
  classroomsOfStaff,
  conversationsFor,
  invoicesFor,
  noticesFor,
  overdueCount,
} from "@/frontend/store/queries";
import type { BadgeCounts } from "@/frontend/components/layout/AppSidebar";

/** Live sidebar/tab-bar counters for the given surface. */
export function useBadgeCounts(surface: "admin" | "teacher" | "parent"): BadgeCounts {
  const session = useSession();
  const guardianId = useGuardianId();
  const staffId = useStaffId();

  const students = useErpStore((s) => s.students);
  const guardians = useErpStore((s) => s.guardians);
  const staff = useErpStore((s) => s.staff);
  const classrooms = useErpStore((s) => s.classrooms);
  const conversations = useErpStore((s) => s.conversations);
  const notices = useErpStore((s) => s.notices);
  const invoices = useErpStore((s) => s.invoices);
  const inquiries = useErpStore((s) => s.inquiries);
  const applications = useErpStore((s) => s.applications);
  const notifications = useErpStore((s) => s.notifications);

  if (surface === "admin") {
    return {
      fees: overdueCount(invoices),
      admissions:
        inquiries.filter((i) => i.stage === "NEW").length +
        applications.filter((a) => a.status === "SUBMITTED").length,
      notifications: notifications.filter((n) => !n.read).length,
    };
  }

  if (surface === "teacher") {
    const mine = classroomsOfStaff(classrooms, staff, staffId).map((c) => c.id);
    return {
      messages: conversations
        .filter((c) => c.participantIds.includes(staffId))
        .reduce((sum, c) => sum + c.unreadForTeacher, 0),
      notices: noticesFor(notices, "STAFF", mine).filter((n) => !n.readBy.includes(session.id)).length,
    };
  }

  const kids = childrenOfGuardian(students, guardians, guardianId);
  const classroomIds = kids.map((k) => k.classroomId).filter((id): id is string => !!id);
  return {
    messages: conversationsFor(conversations, session.id)
      .concat(conversations.filter((c) => c.participantIds.includes(guardianId)))
      .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i)
      .reduce((sum, c) => sum + c.unreadForParent, 0),
    notices: noticesFor(notices, "PARENTS", classroomIds).filter((n) => !n.readBy.includes(session.id)).length,
    fees: invoicesFor(invoices, kids.map((k) => k.id)).filter(
      (i) => i.status === "OVERDUE" || i.status === "SENT" || i.status === "PARTIAL",
    ).length,
  };
}
