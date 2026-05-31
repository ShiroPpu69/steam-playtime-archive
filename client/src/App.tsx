import { useEffect, useMemo, useState } from "react";
import { deleteProfile as deleteProfileRecord, fetchAchievements, fetchAppDetails, fetchArchive, fetchGameHistory, fetchHistory, fetchMockArchive, fetchProfiles, fetchRecent } from "./api/steamApi";
import { DashboardCharts } from "./components/DashboardCharts";
import { ErrorBanner } from "./components/ErrorBanner";
import { ExportButtons } from "./components/ExportButtons";
import { GameCardGrid } from "./components/GameCardGrid";
import { GameDetailDrawer } from "./components/GameDetailDrawer";
import { GameTable } from "./components/GameTable";
import { HistoryPanel } from "./components/HistoryPanel";
import { LoadingArchive } from "./components/LoadingArchive";
import { LanguageToggle } from "./components/LanguageToggle";
import { PanoramaView } from "./components/PanoramaView";
import { ProfileCabinet } from "./components/ProfileCabinet";
import { RecentActivityPanel } from "./components/RecentActivityPanel";
import { SearchPanel } from "./components/SearchPanel";
import { SummaryCards } from "./components/SummaryCards";
import { copy, type Language } from "./i18n";
import type { AchievementSummary, AppDetails, ArchiveGame, ArchiveProfile, ArchiveResponse, GameHistoryPoint, HistoryRun, RecentGame } from "./types/steam";
import { type FilterMode, filterGames } from "./utils/filters";
import { type SortMode, sortGames } from "./utils/sort";
import { formatDate } from "./utils/formatTime";

type ViewMode = "table" | "cards" | "wall";

export default function App() {
  const [profileUrl, setProfileUrl] = useState("steamcommunity.com/id/your-profile/");
  const [language, setLanguage] = useState<Language>("en");
  const [archive, setArchive] = useState<ArchiveResponse | null>(null);
  const [history, setHistory] = useState<HistoryRun[]>([]);
  const [recent, setRecent] = useState<RecentGame[]>([]);
  const [profiles, setProfiles] = useState<ArchiveProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("hours-desc");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [selectedGame, setSelectedGame] = useState<ArchiveGame | null>(null);
  const [achievements, setAchievements] = useState<AchievementSummary | null>(null);
  const [appDetails, setAppDetails] = useState<AppDetails | null>(null);
  const [gameHistory, setGameHistory] = useState<GameHistoryPoint[]>([]);
  const [achievementError, setAchievementError] = useState("");
  const [metadataError, setMetadataError] = useState("");
  const [loadingAchievements, setLoadingAchievements] = useState(false);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const t = copy[language];

  useEffect(() => {
    fetchProfiles().then((data) => setProfiles(data.profiles)).catch(() => setProfiles([]));
  }, []);

  const visibleGames = useMemo(() => {
    if (!archive) return [];
    return sortGames(filterGames(archive.games, filterMode, query), sortMode);
  }, [archive, filterMode, query, sortMode]);

  async function loadArchive(refresh = false, overrideUrl?: string) {
    setLoading(true);
    setError("");
    try {
      const data = await fetchArchive(overrideUrl ?? profileUrl, refresh);
      setArchive(data);
      setHistory((await fetchHistory(data.steamid64)).runs);
      setProfiles((await fetchProfiles()).profiles);
      fetchRecent(data.steamid64).then((result) => setRecent(result.games)).catch(() => setRecent([]));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Archive request failed.");
    } finally {
      setLoading(false);
    }
  }

  async function loadMock() {
    setLoading(true);
    setError("");
    try {
      const data = await fetchMockArchive();
      setArchive(data);
      setHistory([]);
      setRecent([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mock archive failed.");
    } finally {
      setLoading(false);
    }
  }

  async function loadAchievements() {
    if (!archive || !selectedGame) return;
    setLoadingAchievements(true);
    setAchievementError("");
    setAchievements(null);
    try {
      setAchievements(await fetchAchievements(archive.steamid64, selectedGame.appid));
    } catch (err) {
      setAchievementError(err instanceof Error ? err.message : "Achievement record unavailable.");
    } finally {
      setLoadingAchievements(false);
    }
  }

  async function loadMetadata() {
    if (!selectedGame) return;
    setLoadingMetadata(true);
    setMetadataError("");
    try {
      setAppDetails(await fetchAppDetails(selectedGame.appid));
    } catch (err) {
      setMetadataError(err instanceof Error ? err.message : "Store metadata unavailable.");
    } finally {
      setLoadingMetadata(false);
    }
  }

  async function loadGameTrace() {
    if (!archive || !selectedGame) return;
    setLoadingHistory(true);
    try {
      setGameHistory((await fetchGameHistory(archive.steamid64, selectedGame.appid)).points);
    } finally {
      setLoadingHistory(false);
    }
  }

  function openProfileFromCabinet(url: string) {
    setProfileUrl(url);
    void loadArchive(false, url);
  }

  function selectGame(game: ArchiveGame) {
    setSelectedGame(game);
    setAchievements(null);
    setAppDetails(null);
    setGameHistory([]);
    setAchievementError("");
    setMetadataError("");
  }

  async function removeProfile(steamid64: string) {
    await deleteProfileRecord(steamid64);
    setProfiles((await fetchProfiles()).profiles);
  }

  return (
    <main className="archive-shell">
      <LanguageToggle language={language} onChange={setLanguage} />
      <SearchPanel profileUrl={profileUrl} loading={loading} labels={t} onChange={setProfileUrl} onSubmit={loadArchive} onMock={loadMock} />
      <ProfileCabinet title={t.profiles} profiles={profiles} labels={t} onOpen={openProfileFromCabinet} onDelete={removeProfile} />
      {loading && <LoadingArchive title={t.indexing} />}
      {error && <ErrorBanner title={t.recordInaccessible} message={error} />}
      {archive && (
        <>
          <section className="dossier-strip">
            <strong>{t.dossierOpened}</strong>
            <span>{t.subject}: {archive.steamid64}</span>
            <span>{t.source}: STEAM WEB API</span>
            <span>{t.status}: {archive.fromCache ? t.cacheRecord : t.publicRecord}</span>
            <span>{t.indexed}: {formatDate(archive.lastSyncedAt)}</span>
          </section>
          <SummaryCards archive={archive} labels={t} />
          <DashboardCharts archive={archive} labels={t} />
          <RecentActivityPanel title={t.recent} games={recent} labels={t} />
          <section className="controls-panel">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} />
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
              <option value="hours-desc">{t.sortHoursDesc}</option>
              <option value="hours-asc">{t.sortHoursAsc}</option>
              <option value="recent-desc">{t.sortRecent}</option>
              <option value="name-asc">{t.sortNameAsc}</option>
              <option value="name-desc">{t.sortNameDesc}</option>
              <option value="appid">{t.sortAppid}</option>
            </select>
            <select value={filterMode} onChange={(event) => setFilterMode(event.target.value as FilterMode)}>
              <option value="all">{t.filterAll}</option>
              <option value="played">{t.filterPlayed}</option>
              <option value="unplayed">{t.filterUnplayed}</option>
              <option value="recent">{t.filterRecent}</option>
              <option value="community">{t.filterCommunity}</option>
              <option value="top10">{t.filterTop10}</option>
              <option value="top50">{t.filterTop50}</option>
            </select>
            <div className="segmented">
              <button className={viewMode === "table" ? "active" : ""} onClick={() => setViewMode("table")}>{t.viewIndex}</button>
              <button className={viewMode === "cards" ? "active" : ""} onClick={() => setViewMode("cards")}>{t.viewCards}</button>
              <button className={viewMode === "wall" ? "active" : ""} onClick={() => setViewMode("wall")}>{t.viewWall}</button>
            </div>
          </section>
          {visibleGames.length === 0 && <p className="empty-state">{t.noMatch}</p>}
          {viewMode === "table" && <GameTable games={visibleGames} labels={t} onSelect={selectGame} />}
          {viewMode === "cards" && <GameCardGrid games={visibleGames} labels={t} onSelect={selectGame} />}
          {viewMode === "wall" && <PanoramaView games={visibleGames} labels={t} onSelect={selectGame} />}
          <HistoryPanel runs={history} title={t.chronology} labels={t} />
          <ExportButtons archive={archive} visibleGames={visibleGames} labels={t} />
          <GameDetailDrawer
            game={selectedGame}
            achievements={achievements}
            appDetails={appDetails}
            historyPoints={gameHistory}
            achievementError={achievementError}
            metadataError={metadataError}
            loadingAchievements={loadingAchievements}
            loadingMetadata={loadingMetadata}
            loadingHistory={loadingHistory}
            labels={t}
            onClose={() => {
              setSelectedGame(null);
              setAchievements(null);
              setAppDetails(null);
              setGameHistory([]);
              setAchievementError("");
              setMetadataError("");
            }}
            onLoadAchievements={loadAchievements}
            onLoadMetadata={loadMetadata}
            onLoadHistory={loadGameTrace}
          />
        </>
      )}
    </main>
  );
}
