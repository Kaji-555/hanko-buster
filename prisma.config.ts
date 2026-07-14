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
    // CLI(migrate等)は常にDIRECT_URLを読む。中身がローカルDockerか
    // Supabaseかは.env側の責任(コードは環境を意識しない)
    url: env("DIRECT_URL"),
  },
});
