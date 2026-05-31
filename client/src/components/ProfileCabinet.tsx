import type { ArchiveProfile } from "../types/steam";
import { formatDate, formatHours } from "../utils/formatTime";
import type { Copy } from "../i18n";

interface Props {
  title: string;
  profiles: ArchiveProfile[];
  onOpen: (profileUrl: string) => void;
  onDelete: (steamid64: string) => void;
  labels?: Copy;
}

export function ProfileCabinet({ title, profiles, onOpen, onDelete, labels }: Props) {
  const zh = labels?.subtitle === "记录游戏库、累计时长与最近活动。";
  return (
    <section>
      <div className="section-heading">
        <p>{title}</p>
        <span>{profiles.length} {labels?.dossiers ?? "DOSSIERS"}</span>
      </div>
      <div className="profile-cabinet">
        {profiles.length === 0 && <p className="empty-state">{labels?.noProfiles ?? "No local dossiers yet."}</p>}
        {profiles.map((profile) => (
          <article key={profile.steamid64}>
            <span>{labels?.subject ?? "SUBJECT"} / {profile.steamid64}</span>
            <strong>{profile.vanityName || profile.profileUrl}</strong>
            <p>{profile.totalGames ?? 0} {labels?.titles ?? "titles"} / {formatHours(profile.totalPlaytimeMinutes ?? 0)}</p>
            <small>{profile.lastSyncedAt ? formatDate(profile.lastSyncedAt) : (zh ? "尚未入档" : "Not indexed")}</small>
            <div>
              <button className="ghost-button" onClick={() => onOpen(profile.profileUrl)}>{labels?.open ?? "OPEN"}</button>
              <button className="ghost-button danger" onClick={() => onDelete(profile.steamid64)}>{labels?.delete ?? "DELETE"}</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
