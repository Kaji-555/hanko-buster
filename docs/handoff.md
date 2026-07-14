# hanko-buster 開発引き継ぎ v2(前セッションの要約)

これは前のチャットからの引き継ぎ文書。この内容を前提に壁打ち・伴走を継続してほしい。

## 私について

- 研修中の新人SES(研修はPHP/Laravel)。フリーランス独立志向で、市場価値向上のためモダンWeb開発を学習中
- 技術レベル: Udemyで下記スタックのブログアプリを写経した程度。一からの個人開発は初めて
- ポートフォリオとして電子ワークフロー決裁システム **hanko-buster** を開発中
- Claudeへの要望: コードを出すだけでなく「なぜそう書くか」を短く説明してほしい。一度に大量に進めず1機能ずつ。設計判断には理由を添える
- デバッグ方針: エラーメッセージから仮説を立てる練習中。**答えを出す前に自分で考えさせてほしい**(前セッションでは質問形式のコードレビューが効果的だった)
- 環境: Windows(パスがC:\Users\...)、ターミナル版Claude Codeを併用中

## プロジェクト概要

- 詳細はリポジトリの **CLAUDE.md** と **docs/design.md**(ER図・状態遷移図・検討論点)に記載済み。この2つが正
- MVP: 認証 / 申請フォーム(PDF添付) / 承認ルート設定 / 申請→承認・差戻し / 履歴閲覧
- スタック: Next.js 16 (App Router, srcなし構成) + TypeScript + Auth.js v5 (next-auth@5.0.0-beta.31) + shadcn/ui + Tailwind + Prisma 7 + PostgreSQL(ローカルはDocker、本番はSupabase + Vercel無料枠)+ Zod v4

## 確定済みの主要な設計判断

1. 排他制御は**楽観的ロック**(Application.versionカラム + updateManyのcount判定)。悲観的ロックはサーバーレスで不可能なため不採用
2. 状態遷移: DRAFT→SUBMITTED→IN_REVIEW→APPROVED/REJECTED/WITHDRAWN。SUBMITTEDとIN_REVIEWは**UX重視で分ける**
3. 承認ルートはテンプレート(RouteStep)と申請時スナップショット(ApplicationStep)の二重構造
4. 同一ルート内の承認者重複は禁止(DBユニーク制約でも守る)
5. 再申請は同一Applicationレコードの使い回し(差戻し履歴はApprovalActionに残る)
6. 履歴(ApprovalAction)はappend-only。論理削除は使わない
7. ディレクトリ: ルート直下に app/ components/ actions/ lib/ prisma/ docs/(srcなし)
8. **認証はAuth.js Credentials + JWT戦略で確定**。理由: 業務システムの世界観に合致、面談でデモアカウントを配れる、対象ユーザーが一般層でGitHub OAuth不適(OAuthは後付け可能)。CredentialsはDBセッション不可のためJWT一択

## バージョン起因の注意(重要・古い書き方をしないこと)

- **Prisma 7**: 接続URLはschema.prismaに書けない(P1012)。CLI用URLはルートの prisma.config.ts(dotenv import必須)、アプリ用は lib/prisma.ts で PrismaPg アダプタ。seedは package.json の "prisma" キーではなく **prisma.config.ts の migrations.seed** に定義(npm run db:seed)。seed実行はNode 22の --experimental-strip-types(tsx不使用、tsconfig.jsonにallowImportingTsExtensions追加済み)
- **shadcn/ui(現行CLI)**: スタイル指定は廃止され「プリセット」制。プリミティブはRadixではなく **@base-ui/react** が標準。ネットのRadix前提の記事と食い違う
- **Zod v4**: z.string().email() は非推奨。**z.email()** を使う
- **next-auth**: v5はbeta(5.0.0-beta.31)だが実質本流。App Router対応はv5のみ。npmの `auth` パッケージは**Better Auth(別ライブラリ)のCLI**なので混同しない(npx auth secret はBETTER_AUTH_SECRETを吐く)
- これらはCLAUDE.mdにも記載済み

## 完了済み(ステップ1〜6)

1. ✅ GitHubリポジトリ、CLAUDE.md、docs/design.md、docker-compose.yml(PostgreSQL 17)
2. ✅ Prisma 7導入、Userテーブルmigrate済み
3. ✅ **ステップ6: Credentialsログイン一式**
   - prisma/seed.ts: テストユーザー2名をupsertで冪等投入。applicant@example.com(申請 太郎)/ approver@example.com(承認 花子)、パスワード共通 password123
   - auth.ts(ルート直下): authorize()でZod検証(credentialsSchemaをexport済み、将来フォームと共有予定)→ prisma検索 → bcryptjs.compare。session.strategy: "jwt" 明示、trustHost: true(ローカルnext start用)、pages.signIn: "/login"
   - jwtコールバックでtoken.idを焼き込み、sessionコールバックでsession.user.idに詰め直し(承認者チェックで必要)
   - app/api/auth/[...nextauth]/route.ts、app/login(Server Action + useActionState)、app/dashboard(auth()で保護、ログアウトボタン)
4. ✅ shadcn/ui導入、ログイン画面をCard/Input/Label/Buttonで置き換え(ロジック無変更)
5. ✅ **セキュリティレビュー対応**: ユーザー不在時にダミー固定ハッシュへ bcrypt.compare を空撃ちして応答時間を揃える**タイミング攻撃対策**実装済み(計測で差3ms・範囲重複を確認)。design.mdに「タイミング攻撃対策(対応済み)」「JWT即時失効不可(未対応・許容中、将来の選択肢: トークン短命化+更新 / jwtコールバック内DB存在チェック)」を論点として追記済み

## 現在地: ステップ7(Vercel + Supabase早期デプロイ / Walking Skeleton)の途中

段取りは4段。**タスク1の途中から再開**:

1. ⬜ Supabaseプロジェクト作成(東京リージョン、DBパスワード控える)、接続文字列2種を入手 ← **ここから**
2. ⬜ 環境変数を2本立てに配線: アプリ実行用 **DATABASE_URL(Transaction pooler, ポート6543)** / CLI・migrate用 **DIRECT_URL(直接接続, ポート5432)**。prisma.config.tsとlib/prisma.tsの使い分けを設計 → Supabaseへmigrate + seed
3. ⬜ Vercelにリポジトリ接続、環境変数(DATABASE_URL / DIRECT_URL / AUTH_SECRET)設定、デプロイ
4. ⬜ 本番URLでログイン確認

使い分けの理由(前セッションで説明済み、私は理解済み): サーバーレスはインスタンスごとにDB直結すると接続上限を食い潰すためアプリはプーラー経由。ただしTransactionプーラーは接続に紐づく状態(prepared statement等)が使えず、Prismaのmigrateはそれに依存するためCLIは直接接続。

## ステップ7完了後

機能の縦切り実装: 申請CRUD → PDF添付 → 承認ルート → 提出 → 承認/差戻し → 履歴。申請フォーム着手時にauthorize()のcredentialsSchemaを見返し「フォームとサーバーでZodスキーマを共有する」パターンを学ぶ約束

## エージェント(Claude Code)運用の型(前セッションで確立、継続してほしい)

指示プロンプトは次の構成で作る: **実施内容(1項目ごとにコミット)/ 制約(触ってはいけないファイル・追加禁止パッケージを明記)/ 完了条件(build通過+実機検証+「なぜそうしたか」を数行で説明させる)/ 環境**。エージェントが制約に触れる判断をした場合は「代用実装+逸脱の報告」をさせ、採否は人間が決める。完了報告後は差分をレビューして壁打ちする
