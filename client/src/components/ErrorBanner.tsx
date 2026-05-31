interface Props {
  message: string;
  title?: string;
}

export function ErrorBanner({ message, title = "RECORD INACCESSIBLE" }: Props) {
  return (
    <div className="error-banner">
      <strong>{title}</strong>
      <span>{message}</span>
    </div>
  );
}
