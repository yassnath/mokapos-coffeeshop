export function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-muted animate-pulse rounded-2xl ${className ?? ""}`.trim()} />;
}
