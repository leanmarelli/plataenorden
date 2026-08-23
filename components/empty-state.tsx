import type { LucideIcon } from "lucide-react";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4">
      <div
        className="grid place-items-center rounded-2xl mb-4"
        style={{
          width: 64,
          height: 64,
          background: "var(--surface-2)",
          color: "var(--ink-faint)",
        }}
      >
        <Icon size={28} strokeWidth={1.75} />
      </div>
      <h3 className="text-lg font-serif font-semibold mb-1">{title}</h3>
      {description && (
        <p
          className="text-sm max-w-xs"
          style={{ color: "var(--ink-faint)" }}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
