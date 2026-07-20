// 申請ステータスの表示用ラベル定義
//
// 状態遷移そのものの可否判定(何から何へ遷移できるか)は将来
// domain/application-status.ts に一元化する(CLAUDE.md 4-3)。
// ここはあくまで「画面にどう見せるか」だけの責務で、業務ルールは含まない。
// 色だけに頼らずテキストも併記する(CLAUDE.md UI規約)。
import type { ApplicationStatus } from "@prisma/client";

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  DRAFT: "下書き",
  SUBMITTED: "申請済み",
  IN_REVIEW: "承認中",
  APPROVED: "承認済み",
  REJECTED: "差戻し",
  WITHDRAWN: "取り下げ",
};

export const APPLICATION_STATUS_BADGE_CLASSES: Record<
  ApplicationStatus,
  string
> = {
  DRAFT: "bg-muted text-muted-foreground",
  SUBMITTED: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  IN_REVIEW:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  APPROVED:
    "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  REJECTED:
    "bg-destructive/10 text-destructive dark:bg-destructive/20",
  WITHDRAWN: "bg-muted text-muted-foreground",
};
