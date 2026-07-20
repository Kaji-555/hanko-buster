// 自分の申請一覧(Server Component)
//
// 保護の仕組みはdashboardと同じ: ページ先頭でauth()を呼び、
// セッションがなければredirect。一覧の絞り込み(applicantId)自体が
// 「他人の申請を見せない」ための認可なので、必ずサーバー側で行う(CLAUDE.md 4-4)。
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_BADGE_CLASSES,
} from "@/lib/application-status-labels";

export const metadata: Metadata = {
  title: "自分の申請一覧 | hanko-buster",
};

export default async function ApplicationsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const applications = await prisma.application.findMany({
    where: { applicantId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <main className="flex-1 bg-zinc-50 p-8 dark:bg-black">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">
            自分の申請一覧
          </h1>
          <Button render={<Link href="/applications/new">新規作成</Link>} />
        </div>

        <div className="rounded-xl border bg-white shadow-sm dark:bg-zinc-950">
          {applications.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              申請はまだありません。「新規作成」から作成してください。
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>タイトル</TableHead>
                  <TableHead>申請日</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((application) => (
                  <TableRow key={application.id}>
                    <TableCell className="font-medium">
                      {application.title}
                    </TableCell>
                    <TableCell>
                      {application.applicationDate
                        .toISOString()
                        .slice(0, 10)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${APPLICATION_STATUS_BADGE_CLASSES[application.status]}`}
                      >
                        {APPLICATION_STATUS_LABELS[application.status]}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {application.status === "DRAFT" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          render={
                            <Link href={`/applications/${application.id}/edit`}>
                              編集
                            </Link>
                          }
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          -
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </main>
  );
}
