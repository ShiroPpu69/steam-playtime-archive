import { Router } from "express";
import { getGameHistory, getHistory } from "../services/historyService.js";

export const historyRouter = Router();

historyRouter.get("/", (req, res) => {
  const steamid64 = String(req.query.steamid64 ?? "");
  res.json({ steamid64, runs: getHistory(steamid64) });
});

historyRouter.get("/game", (req, res) => {
  const steamid64 = String(req.query.steamid64 ?? "");
  const appid = Number(req.query.appid);
  res.json({ steamid64, appid, points: getGameHistory(steamid64, appid) });
});
