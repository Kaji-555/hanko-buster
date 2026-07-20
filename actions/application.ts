"use server";

// 申請ドラフト(DRAFT状態)のCRUDを行うServer Actions
//
// 認可の方針(CLAUDE.md 4-4): 「承認ボタンを表示しない」はUXでしかなく、
// セキュリティにはならない。取得してからif判定するのではなく、
// update/deleteのwhere句自体に「本人のDRAFTであること」を条件として組み込み、
// 一致件数(count)で成否を判定する。こうすることで
// 「取得はできたが認可漏れで更新してしまう」種類のバグが構造的に起きなくなる。
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { applicationSchema } from "@/lib/schemas/application";

export type ApplicationFormState =
  | {
      errors?: z.core.$ZodFlattenedError<
        z.infer<typeof applicationSchema>
      >["fieldErrors"];
      message?: string;
    }
  | undefined;

export async function createApplication(
  _prevState: ApplicationFormState,
  formData: FormData
): Promise<ApplicationFormState> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // 外部入力(フォーム)はServer Actionの引数でも信用しない。必ずZodで検証する(CLAUDE.md 6)
  const parsed = applicationSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    applicationDate: formData.get("applicationDate"),
  });
  if (!parsed.success) {
    return {
      errors: z.flattenError(parsed.error).fieldErrors,
      message: "入力内容を確認してください。",
    };
  }

  await prisma.application.create({
    data: {
      title: parsed.data.title,
      body: parsed.data.body,
      // applicationDateはZodの時点では文字列のまま検証している。Prismaに渡す直前でのみDate化する
      applicationDate: new Date(parsed.data.applicationDate),
      applicantId: session.user.id,
    },
  });

  revalidatePath("/applications");
  redirect("/applications");
}

export async function updateApplication(
  id: string,
  _prevState: ApplicationFormState,
  formData: FormData
): Promise<ApplicationFormState> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const parsed = applicationSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    applicationDate: formData.get("applicationDate"),
  });
  if (!parsed.success) {
    return {
      errors: z.flattenError(parsed.error).fieldErrors,
      message: "入力内容を確認してください。",
    };
  }

  // 認可 + 状態チェックをwhere句に埋め込む。本人のDRAFT以外は1件もヒットしないため
  // 「他人の申請を編集」「提出済みを編集」がここで構造的に弾かれる
  const result = await prisma.application.updateMany({
    where: { id, applicantId: session.user.id, status: "DRAFT" },
    data: {
      title: parsed.data.title,
      body: parsed.data.body,
      applicationDate: new Date(parsed.data.applicationDate),
    },
  });
  if (result.count === 0) {
    return {
      message:
        "更新できませんでした。編集権限がないか、既に提出済みの可能性があります。",
    };
  }

  revalidatePath("/applications");
  redirect("/applications");
}

export async function deleteApplication(id: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // 削除は物理削除(CLAUDE.md 5: DRAFTはまだ誰の目にも触れていないため物理削除でよい)
  await prisma.application.deleteMany({
    where: { id, applicantId: session.user.id, status: "DRAFT" },
  });

  revalidatePath("/applications");
  redirect("/applications");
}
