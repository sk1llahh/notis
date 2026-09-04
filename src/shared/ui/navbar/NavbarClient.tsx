"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  GraduationCap,
  Flame,
  User,
  Sparkles,
  LogOut,
  ChevronDown,
  Menu,
  X,
  BookOpen,
  Brain,
} from "lucide-react";
import { Button, Badge } from "@/shared/ui";
import { ROUTES } from "@/shared/config";
import type { AuthSession, UserRole } from "@/server/auth";
import type { StreakStatus } from "@/modules/gamification";

export interface NavbarClientProps {
  session: AuthSession | null;
  streak: StreakStatus | null;
}

function getRoleBadgeProps(role?: UserRole): {
  label: string;
  variant: "default" | "available" | "outline" | "completed" | "locked";
} {
  switch (role) {
    case "ADMIN":
      return { label: "Админ", variant: "outline" };
    case "AUTHOR":
      return { label: "Автор", variant: "available" };
    case "STUDENT":
    default:
      return { label: "Студент", variant: "default" };
  }
}

function getDaysWord(days: number): string {
  const mod10 = days % 10;
  const mod100 = days % 100;
  if (mod100 >= 11 && mod100 <= 14) return "дней";
  if (mod10 === 1) return "день";
  if (mod10 >= 2 && mod10 <= 4) return "дня";
  return "дней";
}

export function NavbarClient({ session, streak }: NavbarClientProps) {
  const pathname = usePathname();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Auto-hide Navbar on studio canvas routes
  const isStudioPage = pathname?.startsWith("/studio");

  // Close menus on route navigation
  useEffect(() => {
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Click outside and escape key handlers for user menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (isStudioPage) {
    return null;
  }

  const user = session?.user;
  const isAuthenticated = Boolean(user);
  const isAuthorOrAdmin = user?.role === "AUTHOR" || user?.role === "ADMIN";
  const roleBadge = getRoleBadgeProps(user?.role);

  const initials = (user?.name || user?.email || "U")
    .slice(0, 2)
    .toUpperCase();

  const isCoursesActive =
    pathname === ROUTES.COURSES || pathname?.startsWith("/courses/");
  const isPracticeActive =
    pathname === ROUTES.PRACTICE || pathname?.startsWith("/practice/");

  const handleSignOut = async () => {
    await signOut({ callbackUrl: ROUTES.HOME });
  };

  return (
    <header className="sticky top-0 z-40 w-full h-16 border-b border-border-subtle bg-surface-canvas/85 backdrop-blur-md transition-all">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Left Segment: Logo & Primary Nav Links */}
        <div className="flex items-center gap-6 sm:gap-8">
          <Link
            href={ROUTES.HOME}
            className="flex items-center gap-2.5 hover:opacity-90 transition-opacity select-none"
          >
            <div className="w-8 h-8 rounded-lg bg-status-available/10 border border-status-available/30 flex items-center justify-center text-status-available shadow-sm">
              <GraduationCap className="w-4 h-4" />
            </div>
            <span className="text-base font-bold tracking-tight text-text-primary">
              Notis
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            <Link
              href={ROUTES.COURSES}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                isCoursesActive
                  ? "bg-surface-elevated text-text-primary border border-border-strong shadow-xs"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated/60"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-text-muted" />
              <span>Каталог курсов</span>
            </Link>

            <Link
              href={ROUTES.PRACTICE}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                isPracticeActive
                  ? "bg-surface-elevated text-text-primary border border-border-strong shadow-xs"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated/60"
              }`}
            >
              <Brain className="w-3.5 h-3.5 text-text-muted" />
              <span>Тренажер</span>
            </Link>
          </nav>
        </div>

        {/* Right Segment: Streak, Profile / Auth Actions */}
        <div className="flex items-center gap-3">
          {/* Streak Widget (Authenticated) */}
          {isAuthenticated && streak && streak.streak > 0 && (
            <Link
              href={ROUTES.PROFILE}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition-all cursor-pointer shadow-xs"
              title={`Ударный режим: ${streak.streak} ${getDaysWord(streak.streak)} подряд`}
            >
              <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400 animate-pulse" />
              <span>
                {streak.streak} {getDaysWord(streak.streak)}
              </span>
            </Link>
          )}

          {/* User Menu (Authenticated) */}
          {isAuthenticated && user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-surface-elevated border border-transparent hover:border-border-subtle transition-all cursor-pointer select-none"
                aria-expanded={isUserMenuOpen}
                aria-haspopup="true"
              >
                {/* Avatar / Initials */}
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name || "Аватар"}
                    className="w-7 h-7 rounded-full object-cover border border-border-subtle"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-surface-elevated border border-border-strong flex items-center justify-center text-[11px] font-bold text-text-primary">
                    {initials}
                  </div>
                )}

                <span className="hidden sm:inline text-xs font-medium text-text-primary max-w-[120px] truncate">
                  {user.name || user.email.split("@")[0]}
                </span>

                <ChevronDown
                  className={`w-3.5 h-3.5 text-text-muted transition-transform duration-200 ${
                    isUserMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-border-subtle bg-surface-elevated p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* User Profile Header */}
                  <div className="px-2.5 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-text-primary truncate">
                        {user.name || "Пользователь"}
                      </p>
                      <Badge size="sm" variant={roleBadge.variant}>
                        {roleBadge.label}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-text-muted truncate mt-0.5">
                      {user.email}
                    </p>
                  </div>

                  <div className="h-px bg-border-subtle my-1" />

                  {/* Navigation Links in Dropdown */}
                  <div className="space-y-0.5">
                    <Link
                      href={ROUTES.PROFILE}
                      className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs text-text-secondary hover:text-text-primary hover:bg-surface-card transition-colors"
                    >
                      <User className="w-3.5 h-3.5 text-text-muted" />
                      <span>Профиль и статистика</span>
                    </Link>

                    {isAuthorOrAdmin && (
                      <Link
                        href={ROUTES.COURSES}
                        className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs text-text-secondary hover:text-text-primary hover:bg-surface-card transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-status-available" />
                        <span>Управление курсами</span>
                      </Link>
                    )}
                  </div>

                  <div className="h-px bg-border-subtle my-1" />

                  {/* Sign Out Button */}
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Выйти</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Guest Actions */
            <div className="hidden sm:flex items-center gap-2">
              <Link href={ROUTES.LOGIN}>
                <Button variant="ghost" size="sm">
                  Войти
                </Button>
              </Link>
              <Link href={ROUTES.REGISTER}>
                <Button variant="primary" size="sm">
                  Регистрация
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile Hamburger Toggle Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated md:hidden transition-colors cursor-pointer"
            aria-label={isMobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Slide-down Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-b border-border-subtle bg-surface-card/95 backdrop-blur-xl px-4 py-4 shadow-2xl animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col gap-2">
            <Link
              href={ROUTES.COURSES}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isCoursesActive
                  ? "bg-surface-elevated text-text-primary border border-border-strong"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
              }`}
            >
              <BookOpen className="w-4 h-4 text-text-muted" />
              <span>Каталог курсов</span>
            </Link>

            <Link
              href={ROUTES.PRACTICE}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isPracticeActive
                  ? "bg-surface-elevated text-text-primary border border-border-strong"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
              }`}
            >
              <Brain className="w-4 h-4 text-text-muted" />
              <span>Тренажер</span>
            </Link>

            <div className="h-px bg-border-subtle my-1" />

            {isAuthenticated && user ? (
              <div className="space-y-2">
                <div className="p-2.5 rounded-lg bg-surface-elevated/70 border border-border-subtle flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-text-primary">
                      {user.name || "Пользователь"}
                    </p>
                    <p className="text-[11px] text-text-muted">{user.email}</p>
                  </div>
                  <Badge size="sm" variant={roleBadge.variant}>
                    {roleBadge.label}
                  </Badge>
                </div>

                <Link
                  href={ROUTES.PROFILE}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
                >
                  <User className="w-4 h-4 text-text-muted" />
                  <span>Профиль и статистика</span>
                </Link>

                {isAuthorOrAdmin && (
                  <Link
                    href={ROUTES.COURSES}
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-status-available" />
                    <span>Управление курсами</span>
                  </Link>
                )}

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Выйти из аккаунта</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-1">
                <Link href={ROUTES.LOGIN} className="w-full">
                  <Button variant="ghost" size="md" className="w-full">
                    Войти
                  </Button>
                </Link>
                <Link href={ROUTES.REGISTER} className="w-full">
                  <Button variant="primary" size="md" className="w-full">
                    Регистрация
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
