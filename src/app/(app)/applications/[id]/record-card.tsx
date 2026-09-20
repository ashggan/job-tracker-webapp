import { ExternalLink } from "lucide-react";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <h4 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</h4>
      <div className="text-[13px]">{children}</div>
    </div>
  );
}

export function RecordCard({
  postingUrl,
  dateFound,
}: {
  postingUrl: string | null;
  dateFound: Date;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Record</h3>

      <Field label="Posting">
        {postingUrl ? (
          <a
            href={postingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-accent-foreground hover:underline"
          >
            {postingUrl.replace(/^https?:\/\//, "")}
            <ExternalLink className="size-3" />
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </Field>

      <Field label="Found">{dateFound.toLocaleDateString()}</Field>
    </div>
  );
}
