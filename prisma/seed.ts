// テストユーザーのシードスクリプト
//
// 実行方法: npm run db:seed
//   → prisma db seed → prisma.config.ts の migrations.seed に書いたコマンドが走る
//
// なぜupsertか:
// createだと2回目の実行でemailユニーク制約に衝突して落ちる。
// upsertなら「なければ作る・あれば上書き」なので何度実行しても同じ結果になる(冪等)。
//
// なぜ相対パスに .ts 拡張子があるか:
// このスクリプトはNext.jsを通さず、Node本体の --experimental-strip-types で直接動かす。
// Nodeの標準ESM解決は拡張子の省略を許さないため明示する(tsconfigのallowImportingTsExtensionsで許可済み)。
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.ts";

// デモ用アカウント。パスワードは平文では保存せず、必ずbcryptでハッシュ化する
const TEST_USERS = [
  { email: "applicant@example.com", name: "申請 太郎" }, // 申請者役
  { email: "approver@example.com", name: "承認 花子" }, // 承認者役
] as const;

const TEST_PASSWORD = "password123";

async function main() {
  // コストファクタ10: ハッシュ計算の重さ。大きいほど総当たりに強いが遅くなる(10が一般的な下限)
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

  for (const user of TEST_USERS) {
    const result = await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, passwordHash },
      create: { ...user, passwordHash },
    });
    console.log(`upsert完了: ${result.email} (id: ${result.id})`);
  }
}

main()
  .catch((e) => {
    console.error("シード失敗:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
