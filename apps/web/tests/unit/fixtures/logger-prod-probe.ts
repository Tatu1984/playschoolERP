/**
 * Emits log lines with NODE_ENV=production, so the JSON output path can be
 * observed. Run as a child process by logger.test.ts — the format is decided by
 * the environment, which is fixed once at import.
 */
import { logger } from "@/backend/utils/logger.util";

logger.info("invoice settled", { invoiceId: "inv_9", password: "hunter2" });
logger.warn("slow query", { ms: 1200 });
logger.error("could not reach the gateway", new Error("timeout"), { orderId: "order_2" });
