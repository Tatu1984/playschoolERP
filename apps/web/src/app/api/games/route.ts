import { kidsService } from "@/backend/services/kids.service";
import { open } from "@/backend/utils/route.util";

export const runtime = "nodejs";

// The catalogue is content, not data about a child — safe to serve openly.
export const GET = open(async () => kidsService.catalogue());
