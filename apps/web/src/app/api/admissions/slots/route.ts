import { NextRequest } from "next/server";
import { admissionService } from "@/backend/services/admission.service";
import { open, q } from "@/backend/utils/route.util";
import { AppError } from "@/backend/utils/error-handler.util";

export const runtime = "nodejs";

export const GET = open(async (req: NextRequest) => {
  const branchId = q(req, "branchId");
  const date = q(req, "date");
  if (!branchId || !date) throw new AppError("branchId and date are required", 422, "missing_query");
  return { slots: await admissionService.slotsOn(branchId, date) };
});
