// ダッシュボード(Server Component)
//
// 保護の仕組み: middlewareは使わず、ページの先頭でauth()を呼んで
// セッションがなければredirectする。サーバー側で毎回検証するので、
// URLを直叩きされてもログインなしでは中身が届かない(CLAUDE.md 4-4)。
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { logoutAction } from "@/actions/auth";

export const metadata: Metadata = {
  title: "ダッシュボード | hanko-buster",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="flex-1 bg-zinc-50 p-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">
            ダッシュボード
          </h1>
          <form action={logoutAction}>
            <button
              type="submit"
              className="h-9 rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium shadow-sm hover:bg-zinc-100"
            >
              ログアウト
            </button>
          </form>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">ログイン中のユーザー</p>
          <p className="mt-1 text-lg font-medium">{session.user.email}</p>
        </div>
      </div>
    </main>
  );
}
