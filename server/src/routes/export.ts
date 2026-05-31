import { Router } from "express";
import { exportCsv, exportMarkdown, getCachedArchive } from "../services/exportService.js";
import { asyncRoute } from "../utils/errors.js";

export const exportRouter = Router();

exportRouter.get("/csv", asyncRoute(async (req, res) => {
  const steamid64 = String(req.query.steamid64 ?? "");
  const csv = exportCsv(steamid64);
  res.header("Content-Type", "text/csv; charset=utf-8");
  res.attachment(`playtime-archive-${steamid64}.csv`);
  res.send(csv);
}));

exportRouter.get("/json", asyncRoute(async (req, res) => {
  const steamid64 = String(req.query.steamid64 ?? "");
  res.json(getCachedArchive(steamid64));
}));

exportRouter.get("/markdown", asyncRoute(async (req, res) => {
  const steamid64 = String(req.query.steamid64 ?? "");
  res.header("Content-Type", "text/markdown; charset=utf-8");
  res.attachment(`playtime-archive-${steamid64}.md`);
  res.send(exportMarkdown(steamid64));
}));
