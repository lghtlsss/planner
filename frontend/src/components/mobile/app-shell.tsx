"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, CalendarDays, Check, Home, List } from "lucide-react";
import { getMe, getScheduleForUser } from "@/lib/api";
import { cn } from "cn";
import { AuthGate } from "./auth-gate";
import { TabBar } from "./tab-bar";

function DesktopSidebar() {
  const pathname = usePathname();
  const isOnboarding = pathname === "/onboarding";
  const me = useQuery({ queryKey: ["me"], queryFn: getMe });
  const groupId = me.data?.group_id ?? null;

  const schedule = useQuery({
    queryKey: ["schedule", groupId],
    queryFn: () => getScheduleForUser(me.data),
    enabled: groupId != null,
  });

  const navItems = [
    {
      href: "/",
      label: "Главная",
      icon: Home,
      active: pathname === "/",
      dot: false,
    },
    {
      href: "/plans",
      label: "Мои планы",
      icon: CalendarDays,
      active: pathname.startsWith("/plans") || pathname.startsWith("/day"),
      dot: false,
    },
    {
      href: "/assignments",
      label: "Все задания",
      icon: List,
      active: pathname.startsWith("/assignments"),
      dot: false,
    },
    {
      href: "/schedule",
      label: "Пары",
      icon: BookOpen,
      active: pathname.startsWith("/schedule"),
      dot: Boolean(schedule.data?.has_unread_changes),
    },
  ];

  const isProfileActive =
    pathname.startsWith("/profile") || pathname === "/onboarding";
  const trimmedName = me.data?.name?.trim() ?? "";
  const avatarChar = trimmedName
    ? trimmedName.charAt(0).toUpperCase()
    : isOnboarding
      ? "?"
      : "С";

  return (
    <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col justify-between border-r border-border bg-card px-4 py-6 md:flex">
      <div>
        <Link
          href={isOnboarding ? "/onboarding" : "/"}
          className="flex items-center gap-3 px-2"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-brand-primary text-white">
            <Check className="size-5" strokeWidth={3} />
          </span>
          <span className="text-[19px] font-bold tracking-tight text-text-main">
            Планер
          </span>
        </Link>

        <nav className="mt-8">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-disabled={isOnboarding}
                    className={cn(
                      "relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] leading-[22px] transition-colors",
                      item.active && !isOnboarding
                        ? "bg-brand-primary-light font-semibold text-brand-primary"
                        : "font-medium text-text-main hover:bg-bg-page",
                      isOnboarding && "pointer-events-none opacity-60",
                    )}
                  >
                    {item.dot && (
                      <span
                        className=" -ml-1.5 size-2 shrink-0 rounded-full bg-notify-dot"
                        aria-label="Расписание изменилось"
                      />
                    )}
                    <Icon
                      className={cn(
                        "size-5 shrink-0",
                        item.active && !isOnboarding
                          ? "text-brand-primary"
                          : "text-text-secondary",
                      )}
                      strokeWidth={1.75}
                    />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="border-t border-border pt-4">
        <Link
          href={isOnboarding ? "/onboarding" : "/profile"}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] leading-[22px] transition-colors",
            isProfileActive
              ? "bg-brand-primary-light font-semibold text-brand-primary"
              : "font-medium text-text-main hover:bg-bg-page",
          )}
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-primary-100 text-[12px] font-semibold text-brand-primary">
            {avatarChar}
          </span>
          <span>Профиль</span>
        </Link>
      </div>
    </aside>
  );
}

export function AppShell({
  children,
  maxWidthClassName = "md:max-w-[1120px]",
}: {
  children: ReactNode;
  maxWidthClassName?: string;
}) {
  const pathname = usePathname();
  const isOnboarding = pathname === "/onboarding";

  return (
    <AuthGate>
      <div className="min-h-dvh w-full bg-background md:flex">
        <DesktopSidebar />
        <main className="min-w-0 flex-1">
          <div
            className={cn(
              "mx-auto min-h-dvh w-full max-w-lg px-4 pt-5 pb-28 md:min-h-0 md:px-8 md:py-8 lg:px-10",
              maxWidthClassName,
            )}
          >
            {children}
          </div>
        </main>
      </div>
      {!isOnboarding && (
        <div className="md:hidden">
          <TabBar />
        </div>
      )}
    </AuthGate>
  );
}
