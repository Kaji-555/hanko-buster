# hanko-buster 開発引き継ぎ(前セッションの要約)

これは前のチャットからの引き継ぎ文書。この内容を前提に壁打ち・伴走を継続してほしい。

## 私について

- 24歳・研修中の新人SES(研修はPHP/Laravel)。フリーランス独立志向で、市場価値向上のためモダンWeb開発を学習中
- 技術レベル: Udemyで下記スタックのブログアプリを写経した程度。**一からの個人開発は初めて**
- ポートフォリオとして電子ワークフロー決裁システム **hanko-buster** を開発中
- Claudeへの要望: コードを出すだけでなく「なぜそう書くか」を短く説明してほしい。一度に大量に進めず1機能ずつ。設計判断には理由を添える

## プロジェクト概要

- 詳細はリポジトリの **CLAUDE.md** と **docs/design.md**(ER図・状態遷移図)に記載済み。この2つが正
- MVP: 認証 / 申請フォーム(PDF添付) / 承認ルート設定 / 申請→承認・差戻し / 履歴閲覧
- スタック: Next.js 16 (App Router, srcなし構成) + TypeScript + Auth.js + shadcn/ui + Tailwind + **Prisma 7** + PostgreSQL(ローカルはDocker、本番はSupabase + Vercel無料枠)

## 確定済みの主要な設計判断

1. 排他制御は**楽観的ロック**(Application.versionカラム + updateManyのcount判定)。悲観的ロックはサーバーレスで不可能なため不採用
2. 状態遷移: DRAFT→SUBMITTED→IN_REVIEW→APPROVED/REJECTED/WITHDRAWN。SUBMITTEDとIN_REVIEWは**UX重視で分ける**(申請者への状況の分かりやすさ)
3. 承認ルートはテンプレート(RouteStep)と申請時スナップショット(ApplicationStep)の二重構造
4. 同一ルート内の承認者重複は禁止(DBユニーク制約でも守る)
5. 再申請は同一Applicationレコードの使い回し(差戻し履歴はApprovalActionに残るため)
6. 履歴(ApprovalAction)はappend-only。論理削除は使わない
7. ディレクトリ: ルート直下に app/ components/ domain/ actions/ lib/ prisma/ docs/(srcフォルダなし)

## Prisma 7の注意(重要・v6の書き方をしないこと)

- 導入時にPrisma 7の破壊的変更を踏んで解決済み。接続URLはschema.prismaに書けない(P1012)
- CLI用URL: ルートの **prisma.config.ts**(dotenv import必須)/ アプリ用: **lib/prisma.ts** で `new PrismaClient({ adapter: new PrismaPg({connectionString}) })`
- @prisma/adapter-pg 導入済み。generatorはprisma-client-js(output指定なし、Turbopack対策)
- この注意はCLAUDE.mdにも追記済み

## 現在の状態(完了済み)

1. ✅ GitHubリポジトリ作成、.gitignore確認済み(.env*がignore対象)
2. ✅ CLAUDE.mdをルートに配置(実態に合わせて更新する運用中)
3. ✅ docs/design.md(Mermaid ER図・状態遷移図、検討論点への回答も記載)
4. ✅ docker-compose.yml(PostgreSQL 17のみコンテナ、Next.jsはホストでnpm run dev)
5. ✅ Prisma 7導入、Userテーブルのみmigrate済み、Prisma Studioで確認済み、コミット済み
6. ⬜ Auth.jsでログイン実装 ← **次はここから**
7. ⬜ Vercel + Supabaseへ早期デプロイ(Walking Skeleton)
8. ⬜ 機能の縦切り実装(申請CRUD→PDF添付→承認ルート→提出→承認/差戻し→履歴)

## 次のセッションでやること

**ステップ6: Auth.jsで最小のログインを通す**

- 方式は未決定。候補: Credentials(メール+パスワード、Userテーブルにemail/passwordHashあり)or GitHub OAuth。決めるところから壁打ちしたい
- 「セッションがどこに保存されどう検証されるか」は理解しながら進めたい(前セッションでの約束)
- 完了後はステップ7の早期デプロイへ。その際prisma.config.tsのURLを直接接続(5432)、アプリ側をプーラー(6543)にする使い分けが必要になる

## その他のメモ

- 環境: Windows(パスがC:\Users\...)、ターミナル版Claude Code併用中
- .envはルート直下に作成済み(DATABASE_URL設定済み、AUTH_SECRET/Supabase系はコメントアウトで予告済み)
- デバッグ方針: エラーメッセージから仮説を立てる練習中。答えを出す前に考えさせてくれると嬉しい
