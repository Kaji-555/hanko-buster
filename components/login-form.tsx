"use client";

// ログインフォーム(クライアントコンポーネント)
//
// "use client"にする理由: useActionStateで「エラーメッセージの表示」と
// 「送信中のボタン無効化」というインタラクションを持つため。
// ページ全体ではなくフォームだけをクライアントにする(CLAUDE.md 6)。
import { useActionState } from "react";
import { loginAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  // errorMessage = loginActionの戻り値。初期値undefined(エラーなし)
  const [errorMessage, formAction, isPending] = useActionState(
    loginAction,
    undefined
  );

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>hanko-buster</CardTitle>
        <CardDescription>
          メールアドレスとパスワードでログインしてください
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="user@example.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">パスワード</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>

          {errorMessage && (
            // role="alert": スクリーンリーダーにも即時通知される(色だけに頼らない表示)
            <p role="alert" className="text-sm font-medium text-destructive">
              {errorMessage}
            </p>
          )}

          <Button type="submit" disabled={isPending}>
            {isPending ? "ログイン中..." : "ログイン"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
