// 申請フォームの入力検証スキーマ
//
// フォーム(クライアント側の簡易チェック)とServer Action(サーバー側の正式な検証)の
// 両方でこの1つを共有する。ルールを二重管理しないため(CLAUDE.md 6)。
//
// applicationDateはZodの時点では文字列のまま検証する(z.iso.date()はYYYY-MM-DD形式の文字列を検証するだけで、
// Dateオブジェクトへの変換はしない)。Dateへの変換はPrismaに渡す直前、actions側で行う。
import { z } from "zod";

export const applicationSchema = z.object({
  title: z.string().min(1, "タイトルを入力してください").max(100, "タイトルは100文字以内で入力してください"),
  body: z.string().min(1, "本文を入力してください").max(2000, "本文は2000文字以内で入力してください"),
  applicationDate: z.iso.date("日付の形式が正しくありません"),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;
