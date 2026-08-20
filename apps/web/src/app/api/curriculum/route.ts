import { NextRequest } from "next/server";
import { learningService } from "@/backend/services/learning.service";
import { open, q } from "@/backend/utils/route.util";

export const runtime = "nodejs";

// Public: the programme pages on the marketing site show the term plan.
export const GET = open(async (req: NextRequest) => ({
  curriculum: await learningService.curriculum(q(req, "programSlug")),
}));
