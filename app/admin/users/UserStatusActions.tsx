"use client";

import React, { useState, useTransition } from "react";
import { updateUserRoleAction } from "@/server/actions";
import { Badge } from "@/shared/ui";
import { Ban, CheckCircle2, Unlock, Loader2, AlertCircle, Lock } from "lucide-react";

export interface UserStatusActionsProps {
  userId: string;
  initialIsBanned: boolean;
  isCurrentUser: boolean;
}

export function UserStatusActions({
  userId,
  initialIsBanned,
  isCurrentUser,
}: UserStatusActionsProps) {
  const [isBanned, setIsBanned] = useState(initialIsBanned);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleToggleBan = (nextBannedState: boolean) => {
    if (isCurrentUser || isPending) return;

    setErrorMsg(null);
    startTransition(async () => {
      const res = await updateUserRoleAction({
        targetUserId: userId,
        isBanned: nextBannedState,
      });

      if (res.success) {
        setIsBanned(res.data.isBanned);
      } else {
        setErrorMsg(res.error.message);
      }
    });
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-center gap-2">
        {/* Status Badge */}
        {isBanned ? (
          <Badge
            variant="outline"
            size="sm"
            className="bg-red-500/10 border-red-500/30 text-red-400"
          >
            <Ban className="w-3 h-3" />
            <span>Заблокирован</span>
          </Badge>
        ) : (
          <Badge variant="available" size="sm">
            <CheckCircle2 className="w-3 h-3" />
            <span>Активен</span>
          </Badge>
        )}

        {/* Ban / Unban Button */}
        {isCurrentUser ? (
          <span
            className="text-text-muted p-1 cursor-not-allowed"
            title="Нельзя заблокировать собственную учетную запись"
          >
            <Lock className="w-3.5 h-3.5 text-text-muted" />
          </span>
        ) : isBanned ? (
          <button
            type="button"
            onClick={() => handleToggleBan(false)}
            disabled={isPending}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-status-available hover:bg-status-available/10 border border-status-available/30 transition-colors cursor-pointer disabled:opacity-50"
            title="Разблокировать пользователя"
          >
            {isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Unlock className="w-3 h-3" />
            )}
            <span>Разблокировать</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleToggleBan(true)}
            disabled={isPending}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-red-400 hover:bg-red-500/10 border border-red-500/30 transition-colors cursor-pointer disabled:opacity-50"
            title="Заблокировать пользователя"
          >
            {isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Ban className="w-3 h-3" />
            )}
            <span>Заблокировать</span>
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="flex items-center gap-1 text-[10px] text-red-400 animate-in fade-in duration-150">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
