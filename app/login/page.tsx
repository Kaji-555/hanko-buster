// ログインページ(Server Component)
// ページは「枠」だけを持ち、インタラクションはLoginFormに閉じ込める
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
    <main className="flex flex-1 items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            hanko-buster
          </h1>
          <p className="text-sm text-zinc-500">
            メールアドレスとパスワードでログインしてください
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
