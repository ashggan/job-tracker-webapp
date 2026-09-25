import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { resolveActiveKey } from "@/lib/ai/keys";
import { ImportShell } from "./import-shell";

export default async function ImportPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const resolved = await resolveActiveKey(session.user.id);

  return (
    <div className="mx-auto max-w-2xl px-7 py-8">
      <Link
        href="/job-applications"
        className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to applications
      </Link>
      <h2 className="mb-1 text-2xl">Import applications</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Upload a spreadsheet of job applications you&apos;ve been tracking elsewhere — we&apos;ll clean it
        up and let you review before saving anything.
      </p>

      {!resolved ? (
        <p className="text-sm text-muted-foreground">
          Add an API key in{" "}
          <Link href="/settings" className="text-foreground underline">
            Settings
          </Link>{" "}
          before using bulk import.
        </p>
      ) : (
        <ImportShell />
      )}
    </div>
  );
}
