export default function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3 mb-5">
      <div className="mr-auto">
        <h1 className="text-2xl font-serif font-bold">{title}</h1>
        {subtitle && (
          <p className="text-sm" style={{ color: "var(--ink-faint)" }}>
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
