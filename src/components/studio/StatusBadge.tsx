const STYLE: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "border border-line text-taupe" },
  ready: { label: "Ready", className: "bg-sauge text-sauge-ink" },
  published: { label: "Published", className: "bg-ink text-cream" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STYLE[status] ?? STYLE.draft;
  return <span className={`tag ${s.className}`}>{s.label}</span>;
}

export const STATUS_OPTIONS = [
  { id: "draft", label: "Draft" },
  { id: "ready", label: "Ready to publish" },
  { id: "published", label: "Published" },
];
