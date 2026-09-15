import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { resolveActiveKey } from "@/lib/ai/keys";
import { WizardShell } from "./wizard-shell";

export default async function WizardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const resolved = await resolveActiveKey(session.user.id);

  return (
    <div className="mx-auto max-w-2xl px-7 py-8">
      <Link
        href="/board"
        className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to board
      </Link>
      <h2 className="mb-1 text-2xl">Add a job, guided</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Paste a posting and we&apos;ll pull out the details, check for fit, and help you tailor
        your materials.
      </p>

      {!resolved ? (
        <p className="text-sm text-muted-foreground">
          Add an API key in{" "}
          <Link href="/settings" className="text-foreground underline">
            Settings
          </Link>{" "}
          before using the guided flow.
        </p>
      ) : (
        <WizardShell />
      )}
    </div>
  );
}
