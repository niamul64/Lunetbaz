/**
 * Normalized API error. The backend returns errors as
 *   { "error": { "code": "CONTENT_LOCKED", "message": "...", "details": {...} } }
 * and both transports convert them to this class.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, "BAD_REQUEST", message, details);
  }
  static unauthorized(message = "Please sign in to continue.") {
    return new ApiError(401, "UNAUTHORIZED", message);
  }
  static forbidden(message = "You don't have permission to do this.") {
    return new ApiError(403, "FORBIDDEN", message);
  }
  static notFound(message = "Not found.") {
    return new ApiError(404, "NOT_FOUND", message);
  }
  static conflict(code: string, message: string, details?: unknown) {
    return new ApiError(409, code, message, details);
  }
  static validation(message: string, fieldErrors: Record<string, string>) {
    return new ApiError(422, "VALIDATION_FAILED", message, { fieldErrors });
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
  if (isApiError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
