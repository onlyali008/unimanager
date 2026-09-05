"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/hooks/useStore";
import { TimerWidget } from "@/components/TimerWidget";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/courses", label: "Courses" },
  { href: "/calendar", label: "Calendar" },
  { href: "/timer", label: "Timer" },
  { href: "/progress", label: "Progress" },
  { href: "/assistant", label: "Assistant" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { terms, settings, setCurrentTerm } = useStore();

  // Apply the chosen theme to the document (system = follow OS via CSS).
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", settings.theme);
  }, [settings.theme]);

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <div className="shell" data-density={settings.density}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <header className="rail">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">Semestra</span>
        </div>

        <nav className="rail-nav" aria-label="Primary">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="nav-link"
              aria-current={isActive(item.href) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="rail-term">
          <label htmlFor="term-select" className="field-label">
            Term
          </label>
          <select
            id="term-select"
            className="field-input"
            value={settings.currentTermId}
            onChange={(e) => setCurrentTerm(e.target.value)}
          >
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      <main id="main" className="content">
        {children}
      </main>

      <TimerWidget />
    </div>
  );
}
