import { kidsService } from "@/backend/services/kids.service";
import { open } from "@/backend/utils/route.util";

export const runtime = "nodejs";

export const GET = open(async () => ({ stories: (await kidsService.catalogue()).stories }));
