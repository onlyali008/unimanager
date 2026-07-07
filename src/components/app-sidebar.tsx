"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, LayoutDashboard, Library, Sparkles } from "lucide-react";

import { DOMAINS } from "@/lib/domains";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

const planItems = [
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/assistant", label: "Assistant", icon: Sparkles },
];

const archiveItems = [{ href: "/library", label: "Library", icon: Library }];

export function AppSidebar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex size-8 shrink-0 items-center justify-center border-2 border-sidebar-primary bg-sidebar-primary font-heading text-lg font-bold text-sidebar-primary-foreground">
                  S
                </div>
                <div className="grid leading-tight">
                  <span className="font-heading text-base font-bold tracking-tight">
                    SEMESTRA
                  </span>
                  <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-sidebar-foreground/60">
                    File / Active Term
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive("/")}
                  tooltip="Overview"
                >
                  <Link href="/">
                    <LayoutDashboard className="size-4" />
                    <span>Overview</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.2em]">
            <span className="mr-1.5 text-sidebar-primary">§</span>
            Track
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {DOMAINS.map((domain, i) => (
                <SidebarMenuItem key={domain.slug}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(`/${domain.slug}`)}
                    tooltip={domain.label}
                  >
                    <Link href={`/${domain.slug}`}>
                      <domain.icon className={cn("size-4", domain.textClass)} />
                      <span>{domain.label}</span>
                      <span className="ml-auto font-mono text-[0.6rem] tabular-nums text-sidebar-foreground/40">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.2em]">
            <span className="mr-1.5 text-sidebar-primary">§</span>
            Plan
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {planItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                    tooltip={item.label}
                  >
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.2em]">
            <span className="mr-1.5 text-sidebar-primary">§</span>
            Archive
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {archiveItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                    tooltip={item.label}
                  >
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center gap-2 px-1 py-1 group-data-[collapsible=icon]:hidden">
          <span className="size-1.5 shrink-0 bg-sidebar-primary" />
          <span className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-sidebar-foreground/50">
            Confidential // Personal
          </span>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
