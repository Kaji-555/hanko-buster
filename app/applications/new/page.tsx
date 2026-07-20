// 申請の新規作成ページ(Server Component)
//
// フォーム本体はApplicationForm(クライアントコンポーネント)に持たせ、
// このページ自体は認可(ログインチェック)と配置だけを担当する。
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createApplication } from "@/actions/application";
import { ApplicationForm } from "@/components/application-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "申請の新規作成 | hanko-buster",
};

export default async function NewApplicationPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="flex-1 bg-zinc-50 p-8 dark:bg-black">
      <div className="mx-auto max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>申請の新規作成</CardTitle>
          </CardHeader>
          <CardContent>
            <ApplicationForm action={createApplication} submitLabel="作成" />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
