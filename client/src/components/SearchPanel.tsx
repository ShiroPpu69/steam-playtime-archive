import { Archive, RefreshCw, Search } from "lucide-react";

interface Props {
  profileUrl: string;
  loading: boolean;
  labels: {
    appTitle: string;
    subtitle: string;
    subjectUrl: string;
    openDossier: string;
    refreshCache: string;
    mockRecord: string;
    supported: string;
    archiveId: string;
  };
  onChange: (value: string) => void;
  onSubmit: (refresh?: boolean) => void;
  onMock: () => void;
}

export function SearchPanel({ profileUrl, loading, labels, onChange, onSubmit, onMock }: Props) {
  return (
    <section className="search-panel">
      <div className="panel-mark">{labels.archiveId} / SPA-001</div>
      <div className="title-block">
        <h1>{labels.appTitle}</h1>
        <p>{labels.subtitle}</p>
      </div>
      <form
        className="profile-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(false);
        }}
      >
        <label htmlFor="profileUrl">{labels.subjectUrl}</label>
        <div className="input-row">
          <input
            id="profileUrl"
            value={profileUrl}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Steam profile URL"
          />
          <button type="submit" className="brass-button" disabled={loading}>
            <Search size={16} />
            {labels.openDossier}
          </button>
          <button type="button" className="ghost-button" onClick={() => onSubmit(true)} disabled={loading}>
            <RefreshCw size={16} />
            {labels.refreshCache}
          </button>
          <button type="button" className="ghost-button" onClick={onMock} disabled={loading}>
            <Archive size={16} />
            {labels.mockRecord}
          </button>
        </div>
      </form>
      <div className="supported-records">
        {labels.supported}
      </div>
    </section>
  );
}
