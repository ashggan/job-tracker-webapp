import { auth } from "@/lib/auth";
import { getInitials } from "@/lib/utils";
import { NavBar } from "@/components/nav-bar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const initials = getInitials(session?.user?.name, session?.user?.email);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <NavBar initials={initials} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
