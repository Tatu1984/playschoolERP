/**
 * Prints which payment driver the current environment selects, and nothing
 * else. Run as a child process by payments.test.ts — the driver is chosen once
 * at import, so each environment needs its own process to observe it.
 */
import { paymentGateway } from "@/backend/integrations/payments";

console.log(`DRIVER:${paymentGateway.name}`);
