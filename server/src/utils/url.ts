import { ApiError, errorCodes } from "./errors.js";

export interface ParsedSteamProfile {
  type: "vanity" | "steamid64";
  vanityName?: string;
  steamid64?: string;
  profileUrl: string;
}

const steamId64Pattern = /^7656\d{13}$/;

export function parseSteamProfileUrl(raw: string): ParsedSteamProfile {
  const cleaned = raw.trim();
  if (!cleaned) {
    throw new ApiError(400, errorCodes.INVALID_PROFILE_URL, "请输入有效的 Steam 个人主页链接，例如 steamcommunity.com/id/xxx 或 steamcommunity.com/profiles/7656xxx。");
  }

  const withProtocol = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    throw new ApiError(400, errorCodes.INVALID_PROFILE_URL, "请输入有效的 Steam 个人主页链接，例如 steamcommunity.com/id/xxx 或 steamcommunity.com/profiles/7656xxx。");
  }

  if (url.hostname.toLowerCase() !== "steamcommunity.com") {
    throw new ApiError(400, errorCodes.INVALID_PROFILE_URL, "请输入 steamcommunity.com 的个人主页链接。");
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) {
    throw new ApiError(400, errorCodes.INVALID_PROFILE_URL, "请输入有效的 Steam 个人主页链接，例如 steamcommunity.com/id/xxx 或 steamcommunity.com/profiles/7656xxx。");
  }

  if (parts[0] === "id" && parts[1]) {
    const vanityName = decodeURIComponent(parts[1]);
    return {
      type: "vanity",
      vanityName,
      profileUrl: `https://steamcommunity.com/id/${encodeURIComponent(vanityName)}/`
    };
  }

  if (parts[0] === "profiles" && parts[1]) {
    if (!steamId64Pattern.test(parts[1])) {
      throw new ApiError(400, errorCodes.INVALID_PROFILE_URL, "SteamID64 看起来不合法。请使用类似 7656 开头的 17 位 SteamID64。");
    }
    return {
      type: "steamid64",
      steamid64: parts[1],
      profileUrl: `https://steamcommunity.com/profiles/${parts[1]}/`
    };
  }

  throw new ApiError(400, errorCodes.INVALID_PROFILE_URL, "请输入有效的 Steam 个人主页链接，例如 steamcommunity.com/id/xxx 或 steamcommunity.com/profiles/7656xxx。");
}
