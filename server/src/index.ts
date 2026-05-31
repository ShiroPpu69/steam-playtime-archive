import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";
import { getDb } from "./db.js";
import { errorMiddleware } from "./utils/errors.js";
import { steamRouter } from "./routes/steam.js";
import { historyRouter } from "./routes/history.js";
import { exportRouter } from "./routes/export.js";
import { mockRouter } from "./routes/mock.js";
import { profilesRouter } from "./routes/profiles.js";

const app = express();

getDb();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: [
        "'self'",
        "data:",
        "https://media.steampowered.com",
        "https://cdn.cloudflare.steamstatic.com",
        "https://shared.cloudflare.steamstatic.com",
        "https://avatars.steamstatic.com"
      ],
      connectSrc: ["'self'"]
    }
  }
}));
app.use(cors({ origin: config.clientOrigin }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "steam-playtime-archive" });
});

app.use("/api/steam", steamRouter);
app.use("/api/history", historyRouter);
app.use("/api/export", exportRouter);
app.use("/api/mock", mockRouter);
app.use("/api/profiles", profilesRouter);

const clientDist = [path.resolve(process.cwd(), "../client/dist"), path.resolve(process.cwd(), "client/dist")].find((candidate) => fs.existsSync(candidate));
if (clientDist) {
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(clientDist, "index.html"));
  });
}
app.use(errorMiddleware);

app.listen(config.port, () => {
  console.log(`PLAYTIME ARCHIVE server listening on http://localhost:${config.port}`);
});
