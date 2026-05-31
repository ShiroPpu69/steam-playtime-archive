import { Router } from "express";
import { asyncRoute } from "../utils/errors.js";
import { resolveProfile, getArchive } from "../services/gameService.js";
import { getRecentlyPlayed } from "../services/steamApi.js";
import { getAchievements } from "../services/achievementService.js";
import { getAppDetails } from "../services/appDetailsService.js";

export const steamRouter = Router();

steamRouter.get("/resolve", asyncRoute(async (req, res) => {
  const profileUrl = String(req.query.profileUrl ?? "");
  res.json(await resolveProfile(profileUrl));
}));

steamRouter.get("/games", asyncRoute(async (req, res) => {
  const profileUrl = String(req.query.profileUrl ?? "");
  const refresh = String(req.query.refresh ?? "false") === "true";
  res.json(await getArchive(profileUrl, refresh));
}));

steamRouter.get("/recent", asyncRoute(async (req, res) => {
  const steamid64 = String(req.query.steamid64 ?? "");
  res.json({ steamid64, games: await getRecentlyPlayed(steamid64) });
}));

steamRouter.get("/achievements", asyncRoute(async (req, res) => {
  const steamid64 = String(req.query.steamid64 ?? "");
  const appid = Number(req.query.appid);
  res.json(await getAchievements(steamid64, appid));
}));

steamRouter.get("/appdetails", asyncRoute(async (req, res) => {
  const appid = Number(req.query.appid);
  res.json(await getAppDetails(appid));
}));
