import { redirect } from "next/navigation";
import { getAuthSession } from "@/server/auth";
import { ROUTES } from "@/shared/config";
import { RegisterForm } from "./RegisterForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Регистрация | Notis",
  description: "Создание нового аккаунта в образовательной платформе Notis",
};

export default async function RegisterPage() {
  const session = await getAuthSession();

  // If already authenticated, redirect to Profile
  if (session?.user) {
    redirect(ROUTES.PROFILE);
  }

  return (
    <main className="w-full min-h-screen bg-surface-canvas text-text-primary flex flex-col items-center justify-center p-4 sm:p-6">
      <RegisterForm />
    </main>
  );
}
