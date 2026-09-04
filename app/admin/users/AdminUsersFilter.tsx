"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input } from "@/shared/ui";
import { Search, X, Users, Filter } from "lucide-react";

const ROLE_FILTERS = [
  { value: "ALL", label: "Все" },
  { value: "USER", label: "Студенты" },
  { value: "AUTHOR", label: "Авторы" },
  { value: "ADMIN", label: "Администраторы" },
] as const;

export function AdminUsersFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const urlQuery = searchParams.get("q") || "";
  const currentRole = searchParams.get("role") || "ALL";

  const [searchTerm, setSearchTerm] = useState(urlQuery);

  // Synchronize local search term if URL query changed externally
  useEffect(() => {
    setSearchTerm(urlQuery);
  }, [urlQuery]);

  // Debounced search sync to URL
  useEffect(() => {
    if (searchTerm === urlQuery) {
      return;
    }

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (searchTerm.trim().length > 0) {
        params.set("q", searchTerm.trim());
      } else {
        params.delete("q");
      }

      startTransition(() => {
        const qs = params.toString();
        router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, urlQuery, pathname, router, searchParams]);

  const handleRoleChange = (roleValue: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (roleValue && roleValue !== "ALL") {
      params.set("role", roleValue);
    } else {
      params.delete("role");
    }

    startTransition(() => {
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  };

  const handleClearAll = () => {
    setSearchTerm("");
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  };

  const hasActiveFilters = Boolean(urlQuery) || currentRole !== "ALL";

  return (
    <div className="flex flex-col gap-4 w-full bg-surface-card border border-border-subtle rounded-xl p-4 sm:p-5 shadow-xs">
      {/* Search Input Row */}
      <div className="relative w-full">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        <Input
          type="text"
          placeholder="Поиск по email или имени пользователя..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-9 bg-surface-elevated/70"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              const params = new URLSearchParams(searchParams.toString());
              params.delete("q");
              const qs = params.toString();
              router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1 rounded-sm cursor-pointer"
            title="Очистить поиск"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Role Filter Chips Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-text-muted font-medium mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Роль:</span>
          </div>

          {ROLE_FILTERS.map((opt) => {
            const isSelected =
              currentRole.toUpperCase() === opt.value.toUpperCase();

            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleRoleChange(opt.value)}
                className={`text-xs px-3 py-1.5 rounded-md border font-medium transition-all cursor-pointer ${
                  isSelected
                    ? "bg-status-available/15 border-status-available/40 text-status-available shadow-xs"
                    : "bg-surface-elevated/50 border-border-subtle hover:border-border-strong text-text-secondary hover:text-text-primary"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1 self-end sm:self-auto cursor-pointer transition-colors"
          >
            <X className="w-3 h-3" />
            <span>Сбросить фильтры</span>
          </button>
        )}
      </div>
    </div>
  );
}
