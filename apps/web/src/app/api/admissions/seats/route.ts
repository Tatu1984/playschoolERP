import { NextRequest } from "next/server";
import { admissionService } from "@/backend/services/admission.service";
import { open, q } from "@/backend/utils/route.util";

export const runtime = "nodejs";

// Public: "are there places in Nursery at Dhakuria?" is an admissions question.
export const GET = open(async (req: NextRequest) => ({
  seats: await admissionService.seats(q(req, "branchId")),
}));
