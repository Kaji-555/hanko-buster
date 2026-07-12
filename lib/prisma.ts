// Prismaクライアントのシングルトン (Prisma 7対応版)
//
// Prisma 7からの変更点:
// PrismaClientは「ドライバーアダプター」経由でDBに繋ぐ方式に一本化された。
// PostgreSQLの場合は @prisma/adapter-pg を渡す。
// アプリ実行時の接続URLはここで指定する(CLI用はprisma.config.ts側)。
//
// シングルトンにする理由は従来どおり:
// Next.js開発サーバーのホットリロードで接続が増殖するのを防ぐ。

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

