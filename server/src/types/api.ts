import type { Request, Response, NextFunction } from "express";

export type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: string;
  };
}
