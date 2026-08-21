import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { logger } from "./logger.util";

/** Base class for expected, client-facing errors carrying an HTTP status. */
export class AppError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 400, code = "bad_request") {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401, "unauthorized");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have access to this resource") {
    super(message, 403, "forbidden");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, 404, "not_found");
  }
}

/** Convert any thrown error into a safe JSON response. */
export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: "Validation failed", code: "validation_error", issues: err.issues },
      { status: 422 },
    );
  }
  if (err instanceof AppError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.status },
    );
  }
  // Anything reaching here is a bug rather than a refusal, so it is logged in
  // full and answered with nothing: the caller gets a code to quote, and the
  // stack stays on the server where it cannot tell an attacker how this is
  // built.
  logger.error("Unhandled error in route handler", err);
  return NextResponse.json(
    { error: "Internal server error", code: "internal_error" },
    { status: 500 },
  );
}
