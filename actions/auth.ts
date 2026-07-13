"use server";

// 認証まわりのServer Actions
//
// フォーム送信はブラウザから直接signIn()を呼べないため、
// このサーバー側の関数を経由する(クライアントには関数の「参照」だけが渡る)。
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";

// useActionStateと組み合わせる規約:
// 第1引数 = 前回の戻り値(エラーメッセージ)、第2引数 = フォームデータ。
// 戻り値がそのまま画面のエラーメッセージになる。成功時はredirectするので戻らない。
export async function loginAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
    return undefined; // 実際には成功時ここに到達しない(redirectが例外として投げられる)
  } catch (error) {
    if (error instanceof AuthError) {
      // CredentialsSignin = authorize()がnullを返した(=認証失敗)
      return error.type === "CredentialsSignin"
        ? "メールアドレスまたはパスワードが正しくありません。"
        : "ログイン処理でエラーが発生しました。時間をおいて再度お試しください。";
    }
    // Next.jsのredirect()は「例外を投げる」仕組みで実装されている。
    // ここで握りつぶすと画面遷移しなくなるため、AuthError以外は必ず再スロー
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
