"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  ClipboardList,
  FileText,
  HandHeart,
  Menu,
  Settings,
  Truck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  match?: "exact" | "prefix";
};

const publicNav: NavItem[] = [
  { href: "/", label: "Request a Trailer", icon: Truck, match: "exact" },
  { href: "/donate", label: "Make a Donation", icon: HandHeart, match: "exact" },
];

const staffNav: NavItem[] = [
  {
    href: "/staff/manage",
    label: "Manage Donations",
    icon: ClipboardList,
    match: "prefix",
  },
  {
    href: "/staff/trailer-reports",
    label: "Trailer Reports",
    icon: FileText,
    match: "prefix",
  },
  {
    href: "/staff/reports",
    label: "Reports",
    icon: BarChart3,
    match: "prefix",
  },
  {
    href: "/staff/settings",
    label: "Settings",
    icon: Settings,
    match: "prefix",
  },
];

function isActive(pathname: string, item: NavItem) {
  if (item.match === "exact") return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = isActive(pathname, item);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-3 text-[0.95rem] font-semibold transition-colors touch-manipulation",
        "min-h-11 text-white",
        active
          ? "bg-[#2b6fd4] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25)]"
          : "hover:bg-white/15",
      )}
    >
      <Icon
        className="size-5 shrink-0 text-white"
        strokeWidth={active ? 2.25 : 2}
      />
      <span className="leading-tight text-white">{item.label}</span>
    </Link>
  );
}

function SidebarContent({
  pathname,
  onNavigate,
  staffSession,
}: {
  pathname: string;
  onNavigate?: () => void;
  staffSession: boolean;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pt-5 pb-4 border-b border-white/20">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-3 min-w-0"
        >
          <span className="grid size-10 place-items-center rounded-lg bg-white text-[#003f91] text-base font-bold shrink-0">
            G
          </span>
          <span className="min-w-0">
            <span className="block text-base font-bold leading-tight text-white">
              Good to Go
            </span>
            <span className="block text-xs text-white/80 truncate">
              Donation Trailers
            </span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          <p className="px-3 mb-2 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-white/80">
            Public
          </p>
          <div className="space-y-1">
            {publicNav.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                pathname={pathname}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="px-3 mb-2 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-white/80">
            Staff
          </p>
          <div className="space-y-1">
            {staffNav.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                pathname={pathname}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      </nav>

      <div className="mt-auto border-t border-white/20 p-3 space-y-2">
        {staffSession ? (
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="btn btn-on-blue w-full !min-h-11">
              Sign out
            </button>
          </form>
        ) : (
          <Link
            href="/staff/login"
            onClick={onNavigate}
            className="btn btn-on-blue w-full !min-h-11"
          >
            Staff sign in
          </Link>
        )}
      </div>
    </div>
  );
}

export function AppShell({
  children,
  staffSession = false,
  showFooter = false,
}: {
  children: React.ReactNode;
  staffSession?: boolean;
  showFooter?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const currentLabel =
    [...publicNav, ...staffNav].find((item) => isActive(pathname, item))
      ?.label || "Good to Go Trailers";

  return (
    <div className="min-h-dvh lg:flex">
      <aside className="hidden lg:flex lg:w-56 xl:w-60 shrink-0 flex-col bg-gw-blue-deep sticky top-0 h-dvh">
        <SidebarContent pathname={pathname} staffSession={staffSession} />
      </aside>

      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          open ? "visible" : "invisible pointer-events-none",
        )}
        aria-hidden={!open}
      >
        <button
          type="button"
          className={cn(
            "absolute inset-0 bg-ink/40 transition-opacity",
            open ? "opacity-100" : "opacity-0",
          )}
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
        <aside
          className={cn(
            "absolute inset-y-0 left-0 w-[min(20rem,88vw)] bg-gw-blue-deep shadow-xl transition-transform duration-200 ease-out",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <button
            type="button"
            className="absolute right-3 top-4 grid size-11 place-items-center rounded-lg bg-white/12 border border-white/25 text-white touch-manipulation"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <X className="size-5" />
          </button>
          <SidebarContent
            pathname={pathname}
            staffSession={staffSession}
            onNavigate={() => setOpen(false)}
          />
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="lg:hidden sticky top-0 z-40 bg-gw-blue-deep text-white">
          <div className="flex items-center gap-3 px-3 sm:px-4 py-2.5 min-h-14">
            <button
              type="button"
              className="grid size-11 place-items-center rounded-lg bg-white/12 border border-white/25 touch-manipulation shrink-0"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
            >
              <Menu className="size-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-base sm:text-lg font-bold truncate">
                {currentLabel}
              </p>
              <p className="text-xs text-white/70 truncate">Good to Go Trailers</p>
            </div>
          </div>
        </header>

        <main className="flex-1 min-w-0">{children}</main>

        {showFooter && (
          <footer className="border-t border-line mt-8 bg-white/60">
            <div className="content-shell py-6 text-sm text-muted flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
              <p>© {new Date().getFullYear()} Goodwill — Good to Go Trailers</p>
              <p>Large-item donation pickup scheduling</p>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
