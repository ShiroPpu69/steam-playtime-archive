import type { Language } from "../i18n";

interface Props {
  language: Language;
  onChange: (language: Language) => void;
}

export function LanguageToggle({ language, onChange }: Props) {
  return (
    <div className="language-toggle" aria-label="Language switch">
      <button className={language === "en" ? "active" : ""} onClick={() => onChange("en")}>EN</button>
      <button className={language === "zh" ? "active" : ""} onClick={() => onChange("zh")}>中文</button>
    </div>
  );
}
