import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NewApplicationForm } from "./new-application-form";

export default async function NewApplicationPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url } = await searchParams;

  return (
    <div className="mx-auto max-w-xl px-7 py-8">
      <Link
        href="/board"
        className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to board
      </Link>
      <h2 className="mb-1 text-2xl">Add a job</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Drops it into your Wishlist — fill in the rest, or edit it later.
      </p>
      <NewApplicationForm defaultUrl={url} />
    </div>
  );
}
