import { redirect } from "next/navigation";
import { getAuthSession } from "@/server/auth";
import { ROUTES } from "@/shared/config";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Вход в систему | Notis",
  description: "Авторизация в образовательной платформе Notis",
};

interface LoginPageProps {
  searchParams: Promise<{
    callbackUrl?: string;
    error?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getAuthSession();
  const params = await searchParams;

  const callbackUrl = params.callbackUrl || ROUTES.PROFILE;

  // If already authenticated, redirect to callback URL or Profile
  if (session?.user) {
    redirect(callbackUrl);
  }

  return (
    <main className="w-full min-h-screen bg-surface-canvas text-text-primary flex flex-col items-center justify-center p-4 sm:p-6">
      <LoginForm callbackUrl={callbackUrl} initialError={params.error} />
    </main>
  );
}
