// Auth.js (next-auth v5) の設定本体
//
// NextAuth() は設定を受け取り、アプリ全体で使う4つの部品を返す:
//   handlers … /api/auth/* を処理するGET/POST(route.tsでexportする)
//   auth     … Server Componentやサーバー処理で「今のセッション」を取る関数
//   signIn / signOut … サーバー側からログイン/ログアウトを起動する関数
//
// セッション戦略はJWT(署名付きCookie)。CredentialsプロバイダはDBセッションと
// 組み合わせられない仕様のため、実質これ一択(docs/design.md 論点4)。
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// ログイン入力の検証スキーマ(CLAUDE.md 6: 外部入力はZodで検証してから使う)。
// 将来ログインフォーム側でも同じルールで事前検証できるようexportしておく。
// 注: z.email()はzod v4の書き方。v3の z.string().email() は非推奨になった
export const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  // Auth.jsは本番ビルド(next start)でHostヘッダを既定で信頼せずUntrustedHostエラーになる。
  // Vercel上では自動で信頼されるため、この設定はローカルで本番ビルドを動かすためのもの。
  // (リバースプロキシ配下で自前ホスティングする場合は要再検討)
  trustHost: true,
  // 未ログイン時の誘導先を自作のログイン画面にする(デフォルトはAuth.js組み込み画面)
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "メールアドレス", type: "email" },
        password: { label: "パスワード", type: "password" },
      },
      // authorize() = 「この認証情報は本物か?」だけに責任を持つ関数。
      // nullを返す = 認証失敗。理由(ユーザー不在/パスワード違い)は呼び出し側に
      // 区別させない。攻撃者に「このemailは存在する」というヒントを与えないため。
      async authorize(credentials) {
        // 外部入力なので型を信用しない。Zodで形式ごと検証し、不正なら即失敗
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        // 平文パスワードを保存済みハッシュと照合(bcryptがソルト込みで検証してくれる)
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        // ここで返したオブジェクトが下のjwtコールバックのuserに渡る。
        // passwordHashは絶対に含めない
        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    // jwt: トークンを発行/更新するたびに呼ばれる。
    // userが入っているのはログイン直後の1回だけなので、そこでidをトークンに焼き込む。
    // 以降のリクエストではトークンに残ったidがそのまま使われる
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    // session: auth()が返すセッションオブジェクトを組み立てる。
    // デフォルトではuser.idが入らないため、トークンから詰め直す。
    // 承認者チェック(このユーザーはこのステップの承認者か?)で必ずidが要るので今入れておく
    session({ session, token }) {
      if (typeof token.id === "string") {
        session.user.id = token.id;
      }
      return session;
    },
  },
});
