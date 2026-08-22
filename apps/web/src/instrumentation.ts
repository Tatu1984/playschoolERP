/**
 * Runs once when a server instance starts, before it answers anything.
 *
 * Two jobs, both about not being surprised later:
 *
 *  1. Plug an error tracker into the seam `logger.error` has always had. Until
 *     now every unhandled failure in production went to a log stream and
 *     nowhere else, which is indistinguishable from nobody knowing.
 *  2. Say out loud which integrations booted. Each one refuses rather than
 *     pretends when it is unconfigured — payments switch off, push records
 *     failures, password reset tells the parent to telephone the school — but a
 *     refusal nobody reads is just a surprise saved up. "payments: disabled" in
 *     production means fees are quietly uncollectable, and it belongs in the
 *     first line of the log.
 */
import { logger } from "@/backend/utils/logger.util";

export async function register() {
  // Node-only: these modules read the database and the environment, and this
  // hook also runs in the edge runtime, where they do not belong.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const [{ errorTracker, describeIntegrations }, { setErrorReporter }, { paymentGateway }, { mailer }, { pushSender }] =
    await Promise.all([
      import("@/backend/integrations/error-reporting"),
      import("@/backend/utils/logger.util"),
      import("@/backend/integrations/payments"),
      import("@/backend/integrations/email"),
      import("@/backend/integrations/push"),
    ]);

  setErrorReporter((error, fields) => errorTracker.report({ error, fields }));

  describeIntegrations({
    payments: paymentGateway.name,
    mailer: mailer.name,
    push: pushSender.name,
  });
}

/**
 * Errors Next.js caught on its own — a render that threw, a route that blew up
 * before our handler could translate it. These never reach `logger.error`,
 * because nothing in this codebase caught them, so without this hook the most
 * serious failures are the ones least likely to be reported.
 */
export async function onRequestError(
  error: unknown,
  request: { path: string; method: string },
  context: { routerKind: string; routePath: string; routeType: string },
) {
  // The path can carry a reset token or a child's id in the query string, so
  // only the route pattern is reported — `/parent/children/[id]`, not the id.
  logger.error("Unhandled error while serving a request", error, {
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
    routerKind: context.routerKind,
  });
}
