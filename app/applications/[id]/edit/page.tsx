// 申請の編集ページ(Server Component)
//
// 自分のDRAFTのみ編集可能。findFirstのwhere句自体に
// applicantId + status: DRAFT を条件として含めることで、
// 「他人の申請」「提出済みの申請」はそもそも取得できない(CLAUDE.md 4-4)。
// 該当なしはnotFound()で404にする(存在有無を漏らさないため一律404)。
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { updateApplication } from "@/actions/application";
import { ApplicationForm } from "@/components/application-form";
import { DeleteApplicationButton } from "@/components/delete-application-button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "申請の編集 | hanko-buster",
};

export default async function EditApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;

  const application = await prisma.application.findFirst({
    where: { id, applicantId: session.user.id, status: "DRAFT" },
  });
  if (!application) {
    notFound();
  }

  const updateApplicationWithId = updateApplication.bind(null, application.id);

  return (
    <main className="flex-1 bg-zinc-50 p-8 dark:bg-black">
      <div className="mx-auto max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>申請の編集</CardTitle>
          </CardHeader>
          <CardContent>
            <ApplicationForm
              action={updateApplicationWithId}
              submitLabel="更新"
              defaultValues={{
                title: application.title,
                body: application.body,
                applicationDate: application.applicationDate
                  .toISOString()
                  .slice(0, 10),
              }}
            />
          </CardContent>
          <CardFooter className="justify-end">
            <DeleteApplicationButton applicationId={application.id} />
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
