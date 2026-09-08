export function FormSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Reading the posting…">
      {["Job title", "Company", "Posting link", "Location"].map((label) => (
        <div key={label} className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          <div className="h-9 animate-pulse rounded-sm bg-secondary" />
        </div>
      ))}
      <div className="h-10 w-40 animate-pulse rounded-full bg-secondary" />
    </div>
  );
}
