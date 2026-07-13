"use client";

// ログインフォーム(クライアントコンポーネント)
//
// "use client"にする理由: useActionStateで「エラーメッセージの表示」と
// 「送信中のボタン無効化」というインタラクションを持つため。
// ページ全体ではなくフォームだけをクライアントにする(CLAUDE.md 6)。
//
// 注: shadcn/uiは未導入のため、いったん素のTailwindで同等の見た目を作っている。
// shadcn導入後にButton/Input/Label/Cardへ置き換える。
import { useActionState } from "react";
import { loginAction } from "@/actions/auth";

export function LoginForm() {
  // errorMessage = loginActionの戻り値。初期値undefined(エラーなし)
  const [errorMessage, formAction, isPending] = useActionState(
    loginAction,
    undefined
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          メールアドレス
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="user@example.com"
          className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          パスワード
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
        />
      </div>

      {errorMessage && (
        // role="alert": スクリーンリーダーにも即時通知される(色だけに頼らない表示)
        <p role="alert" className="text-sm font-medium text-red-600">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="h-9 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white shadow hover:bg-zinc-700 disabled:pointer-events-none disabled:opacity-50"
      >
        {isPending ? "ログイン中..." : "ログイン"}
      </button>
    </form>
  );
}
