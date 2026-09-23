"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Plus } from "lucide-react";
import { cn } from "cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/(app)/actions";

// Board view lives at /job-applications?view=board now, not its own route --
// pathname is "/job-applications" either way, so a plain startsWith match is
// enough.
const LINKS = [
  { href: "/job-applications", label: "Job Applications" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/profile", label: "Profile" },
  { href: "/settings", label: "Settings" },
];

export function NavBar({ initials }: { initials: string }) {
  const pathname = usePathname();

  return (
    <header className="flex items-center gap-5 border-b border-border px-7 py-4.5">
      <Link href="/job-applications" className="font-heading text-[19px] font-bold text-accent-foreground">
        JOTA
      </Link>
      <nav className="flex items-center gap-1">
        {LINKS.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-full px-3.5 py-2 text-sm text-muted-foreground transition-colors",
                active
                  ? "bg-accent font-semibold text-accent-foreground"
                  : "hover:text-foreground"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <Button size="sm" nativeButton={false} render={<Link href="/applications/wizard" />}>
        <Plus data-icon="inline-start" />
        New Application
      </Button>
      <div className="flex-1" />
      <DropdownMenu>
        <DropdownMenuTrigger className="flex size-8 items-center justify-center rounded-full bg-accent text-xs font-extrabold text-accent-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {initials}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => logoutAction()}>
            <LogOut className="size-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
