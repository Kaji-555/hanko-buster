// ログインページ(Server Component)
// カードの見た目ごとLoginForm側(shadcnのCard)に持たせたので、ここは配置だけ
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "ログイン | hanko-buster",
};

export default async function LoginPage() {
  // ログイン済みならフォームを見せる意味がないのでダッシュボードへ
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-muted/50 p-4">
      <LoginForm />
    </main>
  );
}
