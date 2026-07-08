import { cookies } from "next/headers";

import { AppSidebar } from "@/components/app-sidebar";
import { LogoutButton } from "@/components/logout-button";
import { ModeToggle } from "@/components/mode-toggle";
import { authEnabled, authSecret } from "@/lib/auth/config";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
  const signedIn =
    authEnabled() &&
    verifySessionToken(
      cookieStore.get(SESSION_COOKIE)?.value,
      authSecret(),
    ) !== null;

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/85 px-4 backdrop-blur">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-1 h-4" />
            <div className="flex items-center gap-2">
              <span
                className="size-1.5 shrink-0 animate-pulse bg-primary"
                aria-hidden
              />
              <span className="hidden font-mono text-[0.65rem] tabular-nums tracking-[0.14em] text-muted-foreground sm:inline">
                {new Date()
                  .toLocaleDateString("en-CA", {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                  .toUpperCase()}
              </span>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <ModeToggle />
              {signedIn ? <LogoutButton /> : null}
            </div>
          </header>
          <div className="flex-1 p-4 md:p-6 lg:p-8">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
