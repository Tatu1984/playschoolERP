import { schoolService } from "@/backend/services/school.service";
import { open } from "@/backend/utils/route.util";

export const runtime = "nodejs";

// Public: the marketing site lists programs to people who have never logged in.
export const GET = open(async () => ({ programs: await schoolService.listPrograms() }));
