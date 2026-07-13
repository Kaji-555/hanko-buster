// Prisma CLI(migrate / studio / generate)用の設定ファイル (Prisma 7以降の必須ファイル)
// ここのURLは「CLIがDBに繋ぐとき」に使われる。アプリ実行時の接続はlib/prisma.ts側。
//
// 注意: Prisma 7からCLIは.envを自動で読まない。dotenvのimportが必須。
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // `prisma db seed` で実行されるコマンド。
    // Prisma 7はpackage.jsonの"prisma"キーを読まなくなったため、ここに書く。
    // tsx等の追加パッケージを入れず、Node 22標準のTS実行機能(型を剥がすだけ)を使う。
    // --env-file で.envを読み込む(lib/prisma.tsがDATABASE_URLを必要とするため)。
    seed: "node --env-file=.env --experimental-strip-types prisma/seed.ts",
  },
  datasource: {
    // 本番(Supabase)に対してマイグレーションを打つ日が来たら、
    // ここは直接接続(5432)のURLを指す環境変数に切り替える
    url: env("DATABASE_URL"),
  },
});
