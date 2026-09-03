import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { getAuthSession, assertCourseAuthor } from "@/server/auth";
import { ActionException } from "@/server/actions/safe-action";
import { getCourseStudioGraph, StudioCanvas } from "@/modules/studio";
import { Button } from "@/shared/ui";
import { ROUTES } from "@/shared/config";

interface StudioPageProps {
  params: Promise<{ slug: string }>;
}

export default async function StudioPage({ params }: StudioPageProps) {
  const { slug } = await params;
  const session = await getAuthSession();

  // 1. RBAC Guard check
  try {
    await assertCourseAuthor(slug, session.user?.id);
  } catch (error) {
    if (error instanceof ActionException) {
      if (error.code === "UNAUTHORIZED") {
        redirect(ROUTES.HOME);
      }
      if (error.code === "NOT_FOUND") {
        notFound();
      }
      if (error.code === "FORBIDDEN") {
        return (
          <main className="w-full min-h-screen bg-surface-canvas text-text-primary flex items-center justify-center p-4">
            <div className="max-w-md w-full p-8 rounded-lg bg-surface-card border border-border-subtle shadow-2xl text-center flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-surface-elevated border border-border-strong flex items-center justify-center mb-5">
                <ShieldAlert className="w-7 h-7 text-status-progress" />
              </div>

              <h1 className="text-xl font-bold mb-2">Доступ ограничен (403)</h1>
              <p className="text-sm text-text-secondary leading-relaxed mb-6">
                У вас нет прав автора или редактора для изменения карты этого курса.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                <Link href={ROUTES.COURSE(slug)} className="w-full sm:w-auto">
                  <Button
                    variant="primary"
                    className="w-full sm:w-auto"
                    leftIcon={<ArrowLeft className="w-4 h-4" />}
                  >
                    К просмотру курса
                  </Button>
                </Link>
                <Link href={ROUTES.HOME} className="w-full sm:w-auto">
                  <Button variant="secondary" className="w-full sm:w-auto">
                    На главную
                  </Button>
                </Link>
              </div>
            </div>
          </main>
        );
      }
    }
    throw error;
  }

  // 2. Fetch full course graph without Fog of War
  const graphData = await getCourseStudioGraph(slug);

  if (!graphData) {
    notFound();
  }

  // 3. Render Studio Canvas
  return (
    <main className="w-full h-screen bg-surface-canvas text-text-primary flex flex-col">
      <StudioCanvas initialData={graphData} />
    </main>
  );
}
