"use client";

import React, { useState, useTransition } from "react";
import { updateUserRoleAction } from "@/server/actions";
import { Lock, Loader2, Check, AlertCircle } from "lucide-react";

export interface UserRoleSelectProps {
  userId: string;
  currentRole: "USER" | "AUTHOR" | "ADMIN";
  isCurrentUser: boolean;
}

const ROLE_OPTIONS: Array<{
  value: "USER" | "AUTHOR" | "ADMIN";
  label: string;
}> = [
  { value: "USER", label: "Студент" },
  { value: "AUTHOR", label: "Автор" },
  { value: "ADMIN", label: "Администратор" },
];

export function UserRoleSelect({
  userId,
  currentRole,
  isCurrentUser,
}: UserRoleSelectProps) {
  const [selectedRole, setSelectedRole] = useState(currentRole);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as "USER" | "AUTHOR" | "ADMIN";
    if (newRole === selectedRole || isPending || isCurrentUser) {
      return;
    }

    const previousRole = selectedRole;
    setSelectedRole(newRole);
    setErrorMsg(null);
    setJustSaved(false);

    startTransition(async () => {
      const result = await updateUserRoleAction({
        targetUserId: userId,
        newRole,
      });

      if (!result.success) {
        setSelectedRole(previousRole);
        setErrorMsg(result.error.message);
      } else {
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2500);
      }
    });
  };

  if (isCurrentUser) {
    return (
      <div className="flex items-center gap-2">
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-surface-elevated/70 border border-border-subtle text-text-muted cursor-not-allowed select-none"
          title="Нельзя изменить роль собственной учетной записи"
        >
          <Lock className="w-3 h-3 text-text-muted" />
          <span>Администратор</span>
        </div>
        <span className="text-[11px] text-text-muted hidden sm:inline">(Вы)</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="relative inline-flex items-center">
        <select
          value={selectedRole}
          onChange={handleRoleChange}
          disabled={isPending}
          className={`text-xs font-medium py-1 pl-2.5 pr-7 rounded-md border transition-all appearance-none cursor-pointer focus:outline-none focus:ring-1 ${
            selectedRole === "ADMIN"
              ? "bg-amber-500/10 border-amber-500/30 text-amber-300 focus:border-amber-400 focus:ring-amber-400"
              : selectedRole === "AUTHOR"
              ? "bg-status-available/10 border-status-available/30 text-status-available focus:border-status-available focus:ring-status-available"
              : "bg-surface-elevated border-border-subtle text-text-primary focus:border-border-focus focus:ring-border-focus"
          } ${isPending ? "opacity-60 cursor-wait" : "hover:border-border-strong"}`}
        >
          {ROLE_OPTIONS.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              className="bg-surface-elevated text-text-primary font-normal"
            >
              {opt.label}
            </option>
          ))}
        </select>

        {/* Status Indicator inside/beside select */}
        <div className="absolute right-2 pointer-events-none flex items-center">
          {isPending ? (
            <Loader2 className="w-3 h-3 animate-spin text-text-muted" />
          ) : justSaved ? (
            <Check className="w-3 h-3 text-status-available animate-in zoom-in-50 duration-200" />
          ) : (
            <svg
              className="w-3 h-3 text-text-muted"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-1 text-[11px] text-red-400 mt-0.5 animate-in fade-in duration-150">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
