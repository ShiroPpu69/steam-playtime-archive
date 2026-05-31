import { Router } from "express";
import { deleteProfile, listProfiles } from "../services/historyService.js";

export const profilesRouter = Router();

profilesRouter.get("/", (_req, res) => {
  res.json({ profiles: listProfiles() });
});

profilesRouter.delete("/:steamid64", (req, res) => {
  res.json({ deleted: deleteProfile(req.params.steamid64) });
});
