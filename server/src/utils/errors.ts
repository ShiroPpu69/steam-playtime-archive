import type { NextFunction, Request, Response } from "express";

export class ApiError extends Error {
  status: number;
  code: string;
  details?: string;

  constructor(status: number, code: string, message: string, details?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const errorCodes = {
  MISSING_API_KEY: "STEAM_API_KEY_MISSING",
  STEAM_REQUEST_FAILED: "STEAM_REQUEST_FAILED",
  VANITY_NOT_FOUND: "STEAM_VANITY_NOT_FOUND",
  PRIVATE_PROFILE: "STEAM_PROFILE_PRIVATE",
  EMPTY_LIBRARY: "STEAM_LIBRARY_EMPTY",
  NETWORK_TIMEOUT: "STEAM_NETWORK_TIMEOUT",
  INVALID_RESPONSE: "STEAM_INVALID_RESPONSE",
  SQLITE_INIT_FAILED: "SQLITE_INIT_FAILED",
  CSV_EXPORT_FAILED: "CSV_EXPORT_FAILED",
  INVALID_PROFILE_URL: "INVALID_STEAM_PROFILE_URL",
  ACCOUNT_NOT_FOUND: "STEAM_ACCOUNT_NOT_FOUND",
  RATE_LIMITED: "STEAM_RATE_LIMITED"
} as const;

export function asyncRoute(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}

export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details
      }
    });
    return;
  }

  const message = err instanceof Error ? err.message : "Unknown server error";
  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Archive service failed while processing this record.",
      details: message
    }
  });
}
