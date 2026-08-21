import { NextRequest } from "next/server";
import { admissionService } from "@/backend/services/admission.service";
import { createInquirySchema } from "@/backend/validators/admission.validator";
import { created, open } from "@/backend/utils/route.util";

export const runtime = "nodejs";

/**
 * The contact form on the marketing site (SoW §7.18).
 *
 * A message sent from the website is an admissions lead, so it lands in the
 * same pipeline the office already works from — there is no second inbox for
 * someone to forget to check. What earns this its own route rather than a call
 * to `/api/admissions/inquiry` is the boundary: everything anonymous the site
 * may write lives under `/api/public`, so the open surface can be read off one
 * directory listing instead of grepped for out of the authed ones.
 *
 * The lead source is stamped here and never taken from the body — a form on the
 * public website cannot claim to have been a walk-in or a referral.
 */
export const POST = open(async (req: NextRequest) => {
  const inquiry = await admissionService.createInquiry(createInquirySchema.parse(await req.json()), "WEBSITE");
  return created({ inquiry });
});
