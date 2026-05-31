import { Router } from "express";
import { mockArchive } from "../mock/games.js";

export const mockRouter = Router();

mockRouter.get("/games", (_req, res) => {
  res.json(mockArchive());
});
