"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, Home, List, UserRound } from "lucide-react";
import { cn } from "cn";

const tabs = [
  { href: "/", label: "Главная", icon: Home },
  { href: "/plans", label: "Мои планы", icon: CalendarDays },
  { href: "/assignments", label: "Все задания", icon: List },
  { href: "/schedule", label: "Пары", icon: BookOpen, dot: true },
  { href: "/profile", label: "Профиль", icon: UserRound },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {tabs.map((tab) => {
          const active =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={cn(
                  "relative flex flex-col items-center gap-1 py-2 text-[11px] leading-4 font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span className="relative">
                  <Icon className="size-[22px]" strokeWidth={active ? 2.25 : 1.75} />
                  {tab.dot && (
                    <span className="absolute -top-0.5 -right-1 size-2 rounded-full bg-[#E5484D]" />
                  )}
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
