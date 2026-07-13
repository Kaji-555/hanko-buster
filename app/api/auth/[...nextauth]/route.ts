// Auth.jsが使うAPIエンドポイント (/api/auth/session, /api/auth/callback/... など)
// [...nextauth] はキャッチオールルート: /api/auth/以下の全パスがここに届き、
// 中身の処理はすべてauth.tsのhandlersに委譲する。このファイルは配線だけ
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
