import React from "react";
import { Badge, Card } from "@/shared/ui";
import type { UserProfileDTO } from "../types";
import { Sparkles, Shield, Award } from "lucide-react";

export interface ProfileHeaderProps {
  profile: UserProfileDTO;
}

function getRoleLabel(role: string): { label: string; variant: "default" | "progress" | "diff" } {
  switch (role.toUpperCase()) {
    case "ADMIN":
      return { label: "Администратор", variant: "diff" };
    case "AUTHOR":
      return { label: "Автор", variant: "progress" };
    case "USER":
    case "STUDENT":
    default:
      return { label: "Студент", variant: "default" };
  }
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  const roleInfo = getRoleLabel(profile.role);
  const avatarLetter = (profile.name || profile.email || "U")
    .trim()
    .charAt(0)
    .toUpperCase();

  const xpRemaining = Math.max(0, profile.nextLevelXP - profile.xp);

  return (
    <Card variant="elevated" className="p-6 sm:p-7 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-status-available/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
        {/* User Identity Info */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-surface-elevated to-surface-card border-2 border-border-strong flex items-center justify-center text-2xl sm:text-3xl font-bold text-text-primary shadow-inner shrink-0 select-none">
            {avatarLetter}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
                {profile.name}
              </h1>
              <Badge variant={roleInfo.variant} size="sm">
                <Shield className="w-3 h-3" />
                {roleInfo.label}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-text-secondary">
              {profile.email}
            </p>
          </div>
        </div>

        {/* Level Progression Widget */}
        <div className="w-full md:w-80 lg:w-96 flex flex-col gap-2.5 bg-surface-card/70 border border-border-subtle rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="available" size="md">
                <Award className="w-3.5 h-3.5" />
                Уровень {profile.level}
              </Badge>
              <span className="text-xs font-semibold text-text-muted">
                {profile.progressPercentage}%
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
              <Sparkles className="w-3.5 h-3.5 text-status-progress" />
              <span>{profile.xp.toLocaleString("ru-RU")} XP</span>
            </div>
          </div>

          {/* Animated Progress Bar */}
          <div
            className="w-full h-2.5 rounded-full bg-surface-overlay border border-border-subtle/80 overflow-hidden"
            role="progressbar"
            aria-valuenow={profile.progressPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-status-available transition-all duration-700 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, profile.progressPercentage))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-text-muted">
            <span>До Уровня {profile.level + 1}</span>
            <span>
              {xpRemaining > 0
                ? `Осталось ${xpRemaining.toLocaleString("ru-RU")} XP`
                : "Уровень достигнут!"}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
