import { publicService } from "@/backend/services/public.service";
import { open } from "@/backend/utils/route.util";

export const runtime = "nodejs";

/**
 * What a form on the public website needs to render itself: which campuses
 * exist, which programmes they run, and what a term costs.
 *
 * The enquiry form and the application wizard are client components that can be
 * dropped on any page, so they fetch this rather than depending on whichever
 * server component happens to host them.
 */
export const GET = open(async () => {
  const [branches, programs, feeStructures] = await Promise.all([
    publicService.branches(),
    publicService.programs(),
    publicService.feeStructures(),
  ]);
  return { branches, programs, feeStructures };
});
