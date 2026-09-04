import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/server/auth";
import { getAdminUsersList } from "@/server/services/admin-user-service";
import { AdminUsersFilter } from "./AdminUsersFilter";
import { UserRoleSelect } from "./UserRoleSelect";
import { UserStatusActions } from "./UserStatusActions";
import { Badge } from "@/shared/ui";
import {
  ShieldCheck,
  BookOpen,
  GraduationCap,
  Users,
  SearchX,
  Calendar,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Управление пользователями | Панель администратора Notis",
  description: "Администрирование пользователей и управление ролями платформы Notis.",
};

interface AdminUsersPageProps {
  searchParams: Promise<{
    q?: string;
    role?: string;
  }>;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export default async function AdminUsersPage({
  searchParams,
}: AdminUsersPageProps) {
  // 1. RBAC Session Guard (strictly ADMIN)
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  // 2. Resolve async searchParams
  const params = await searchParams;
  const users = await getAdminUsersList({
    query: params.q,
    role: params.role,
  });

  const currentUserId = session.user.id;

  return (
    <main className="w-full min-h-screen bg-surface-canvas text-text-primary flex flex-col">
      <div className="w-full max-w-7xl mx-auto flex-1 p-4 sm:p-8 flex flex-col gap-6 sm:gap-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border-subtle">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" size="sm">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Панель супер-администратора</span>
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
              Управление пользователями
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary max-w-2xl leading-relaxed">
              Просмотр зарегистрированных пользователей, мониторинг активности и
              безопасное распределение ролей в системе.
            </p>
          </div>

          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-surface-card border border-border-subtle self-start sm:self-auto shadow-xs">
            <Users className="w-4 h-4 text-status-available" />
            <div className="flex flex-col">
              <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">
                Всего найдено
              </span>
              <span className="text-sm font-bold text-text-primary">
                {users.length} {users.length === 1 ? "пользователь" : "пользователей"}
              </span>
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <Suspense fallback={null}>
          <AdminUsersFilter />
        </Suspense>

        {/* Users Table */}
        <div className="w-full bg-surface-card border border-border-subtle rounded-xl overflow-hidden shadow-xs">
          {users.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-surface-elevated border border-border-subtle flex items-center justify-center text-text-muted">
                <SearchX className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-text-primary">
                Пользователи не найдены
              </h3>
              <p className="text-xs sm:text-sm text-text-secondary max-w-sm">
                По вашему запросу не найдено ни одного пользователя. Попробуйте
                изменить поисковый запрос или фильтр по ролям.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border-subtle bg-surface-elevated/50 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                    <th className="py-3 px-4 sm:px-6">Пользователь</th>
                    <th className="py-3 px-4">Системная роль</th>
                    <th className="py-3 px-4 text-center">Статус и доступ</th>
                    <th className="py-3 px-4 text-center">Создано курсов</th>
                    <th className="py-3 px-4 text-center">Зачислений</th>
                    <th className="py-3 px-4 sm:px-6 text-right">Дата регистрации</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {users.map((user) => {
                    const isSelf = user.id === currentUserId;
                    const initials = (user.name || user.email || "U")
                      .slice(0, 2)
                      .toUpperCase();

                    return (
                      <tr
                        key={user.id}
                        className={`hover:bg-surface-elevated/40 transition-colors ${
                          isSelf ? "bg-amber-500/[0.02]" : ""
                        }`}
                      >
                        {/* User Info */}
                        <td className="py-3 px-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            {user.image ? (
                              <img
                                src={user.image}
                                alt={user.name || "Аватар"}
                                className="w-8 h-8 rounded-full object-cover border border-border-subtle shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-surface-elevated border border-border-strong flex items-center justify-center text-xs font-bold text-text-primary shrink-0">
                                {initials}
                              </div>
                            )}
                            <div className="flex flex-col min-w-0">
                              <span className="font-medium text-text-primary truncate max-w-[200px] sm:max-w-[280px]">
                                {user.name || "Без имени"}
                              </span>
                              <span className="text-[11px] text-text-muted truncate max-w-[200px] sm:max-w-[280px]">
                                {user.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* System Role Select */}
                        <td className="py-3 px-4 align-middle">
                          <UserRoleSelect
                            userId={user.id}
                            currentRole={user.role}
                            isCurrentUser={isSelf}
                          />
                        </td>

                        {/* Status and Access (Ban/Unban) */}
                        <td className="py-3 px-4 text-center align-middle">
                          <UserStatusActions
                            userId={user.id}
                            initialIsBanned={user.isBanned}
                            isCurrentUser={isSelf}
                          />
                        </td>

                        {/* Created Courses Count */}
                        <td className="py-3 px-4 text-center align-middle">
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-surface-elevated/80 border border-border-subtle text-xs font-medium text-text-secondary">
                            <BookOpen className="w-3 h-3 text-text-muted" />
                            <span>{user.coursesCount}</span>
                          </div>
                        </td>

                        {/* Enrollments Count */}
                        <td className="py-3 px-4 text-center align-middle">
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-surface-elevated/80 border border-border-subtle text-xs font-medium text-text-secondary">
                            <GraduationCap className="w-3 h-3 text-status-available" />
                            <span>{user.enrollmentsCount}</span>
                          </div>
                        </td>

                        {/* Registration Date */}
                        <td className="py-3 px-4 sm:px-6 text-right align-middle text-text-muted text-xs">
                          <div className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3 hidden sm:inline" />
                            <span>{formatDate(user.createdAt)}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
