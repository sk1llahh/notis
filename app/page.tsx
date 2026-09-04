import Link from "next/link";
import {
  Compass,
  Sparkles,
  Brain,
  Shield,
  ArrowRight,
  BookOpen,
  User,
  GraduationCap,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/shared/ui";
import { ROUTES } from "@/shared/config";
import { getAuthSession } from "@/server/auth";

export default async function Home() {
  const session = await getAuthSession();
  const isAuthenticated = Boolean(session?.user);

  return (
    <div className="min-h-screen bg-surface-canvas text-text-primary flex flex-col items-center justify-between p-4 sm:p-6 relative overflow-hidden">
      {/* Background subtle glow accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-status-available/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-status-completed/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="w-full max-w-5xl flex items-center justify-between py-4 z-10">
        <Link href={ROUTES.HOME} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-status-available/10 border border-status-available/30 flex items-center justify-center text-status-available">
            <GraduationCap className="w-4 h-4" />
          </div>
          <span className="text-base font-bold tracking-tight text-text-primary">
            Notis
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link href={ROUTES.COURSES}>
            <Button size="sm" variant="ghost" leftIcon={<BookOpen className="w-4 h-4" />}>
              Курсы
            </Button>
          </Link>
          <Link href={ROUTES.PRACTICE}>
            <Button size="sm" variant="ghost" leftIcon={<Brain className="w-4 h-4" />}>
              Тренажер
            </Button>
          </Link>
          {isAuthenticated ? (
            <Link href={ROUTES.PROFILE}>
              <Button size="sm" variant="secondary" leftIcon={<User className="w-4 h-4" />}>
                Личный кабинет
              </Button>
            </Link>
          ) : (
            <Link href={ROUTES.LOGIN}>
              <Button size="sm" variant="primary">
                Войти
              </Button>
            </Link>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="w-full max-w-4xl flex flex-col items-center text-center space-y-8 my-auto py-12 z-10">
        {/* Platform Badge */}
        <Badge variant="default" size="md">
          <Sparkles className="w-3.5 h-3.5 text-status-available" />
          <span>Платформа обучения нового поколения</span>
        </Badge>

        {/* Title */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-b from-white via-text-primary to-text-secondary bg-clip-text text-transparent">
            Notis Knowledge Graphs
          </h1>
          <p className="text-base sm:text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
            Интерактивные графы курсов, расчет тумана войны (Fog of War) и
            интервальные повторения SM-2. Изучайте концепции в строгой логической
            последовательности.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5">
          <Link href={ROUTES.COURSES}>
            <Button
              variant="primary"
              size="lg"
              leftIcon={<Compass className="w-5 h-5" />}
              rightIcon={<ArrowRight className="w-4 h-4 ml-1" />}
            >
              Открыть каталог курсов
            </Button>
          </Link>

          <Link href={ROUTES.COURSE("cs-foundations")}>
            <Button variant="secondary" size="lg">
              Основы Computer Science
            </Button>
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full pt-8 text-left">
          <Card variant="interactive">
            <CardHeader className="p-0 pb-2">
              <div className="p-2.5 rounded-sm bg-status-available/10 text-status-available w-fit mb-2">
                <Shield className="w-5 h-5" />
              </div>
              <CardTitle className="text-sm font-bold">Fog of War</CardTitle>
            </CardHeader>
            <CardDescription>
              Продвинутые разделы открываются только после успешного освоения
              обязательных пререквизитов.
            </CardDescription>
          </Card>

          <Card variant="interactive">
            <CardHeader className="p-0 pb-2">
              <div className="p-2.5 rounded-sm bg-status-progress/10 text-status-progress w-fit mb-2">
                <Brain className="w-5 h-5" />
              </div>
              <CardTitle className="text-sm font-bold">
                SM-2 Spaced Repetition
              </CardTitle>
            </CardHeader>
            <CardDescription>
              Алгоритм интервальных повторений для долговременного закрепления
              ключевых понятий.
            </CardDescription>
          </Card>

          <Card variant="interactive">
            <CardHeader className="p-0 pb-2">
              <div className="p-2.5 rounded-sm bg-status-completed/10 text-status-completed w-fit mb-2">
                <Sparkles className="w-5 h-5" />
              </div>
              <CardTitle className="text-sm font-bold">RPG Прокачка & XP</CardTitle>
            </CardHeader>
            <CardDescription>
              Отслеживание стриков, прогресса по уровням (Tiers) и
              версионирование обновлений тем.
            </CardDescription>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl py-4 text-center text-xs text-text-muted z-10 border-t border-border-subtle/50">
        Notis Platform &copy; 2026. Образовательные графы знаний и тренажеры SuperMemo-2.
      </footer>
    </div>
  );
}
