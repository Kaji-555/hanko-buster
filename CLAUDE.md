@AGENTS.md
# CLAUDE.md — hanko-buster

このファイルはプロジェクトの設計思想・技術判断・実装規約を定義する。
コード生成・レビュー・リファクタリングの際は必ずこの内容に従うこと。

---

## 1. プロジェクト概要

**hanko-buster** — 電子ワークフロー決裁システム。ハンコ文化を打破する。

- **目的**: フルスタックエンジニアとしての技術力を示すポートフォリオ。SES面談でのアピールと、フリーランス独立に向けた市場価値向上。
- **開発者**: 24歳・研修中の新人エンジニア(PHP/Laravel研修中)。**一からの個人開発は初めて**。
- **最重要ゴール**: まず完成させること。完璧より完成。過剰設計・過剰抽象化を避ける。

### Claudeの振る舞い方(重要)

- 開発者は学習中である。コードを出すだけでなく、**「なぜそう書くのか」を必ず短く説明する**こと。設計判断には理由を添える。
- 一度に大量のコードを出さない。1機能ずつ、動作確認できる単位で進める。
- 開発者の指示が本ファイルの設計判断と矛盾する場合、黙って従わず**矛盾を指摘して確認を取る**。
- YAGNI原則。本ファイルのスコープ外の機能・抽象化を先回りで実装しない。

---

## 2. スコープ

### MVP(これだけを作る)

1. 認証(ログイン/ログアウト)
2. 申請フォーム(タイトル・本文・PDF添付)
3. PDFアップロード(Supabase Storage)
4. 承認ルート設定(直列の承認ステップ)
5. 申請 → 承認 / 差戻し
6. 履歴閲覧(自分の申請一覧・自分宛の承認待ち一覧・処理済み一覧)

### 将来の機能追加(今は実装しない・設計で拡張余地だけ意識する)

- 代理承認
- 条件分岐ルート(金額による承認者変更など)
- 通知(メール/アプリ内)
- 監査ログの高度化

---

## 3. 技術スタック(変更禁止。変更提案がある場合は理由を明示して開発者に確認)

| レイヤ | 技術 |
|---|---|
| フレームワーク | Next.js 16 (App Router) |
| 言語 | TypeScript (strict: true) |
| 認証 | Auth.js |
| UI | shadcn/ui + Tailwind CSS |
| ORM | Prisma |
| DB | PostgreSQL (Supabase) |
| ストレージ | Supabase Storage (PDF、無料枠1GB) |
| バリデーション | Zod |
| ローカル環境 | Docker (docker-compose) |
| デプロイ | Vercel (無料枠) |

### インフラ上の必須知識

- **Prisma接続は必ずSupabaseのコネクションプーラー経由(ポート6543 / Transaction mode)にする。** Vercelのサーバーレス関数は直接接続(5432)を使うと接続を食い尽くす。`DATABASE_URL`はプーラー、`DIRECT_URL`(マイグレーション用)は直接接続に設定する。
- Vercelサーバーレス環境では**リクエストをまたぐ状態(長時間トランザクション、メモリ上のセッション)を持てない**。すべての状態はDBに永続化する。

---

### Prisma 7の注意(v6以前の書き方をしないこと)
- 接続URLはschema.prismaに書かない。CLI用はprisma.config.ts、アプリ用はlib/prisma.tsのPrismaPgアダプターが持つ
- PrismaClientは必ず `new PrismaClient({ adapter })` で生成(lib/prisma.tsのシングルトンのみ使用)
- directUrlはv7で廃止。本番マイグレーション時はprisma.config.ts側のURLを直接接続にする

---

## 4. 中核となる設計判断(このプロジェクトの心臓部)

### 4-1. 排他制御は「楽観的ロック」を採用する

**悲観的ロック(`SELECT ... FOR UPDATE`を閲覧中保持)は採用しない。** 理由:

- HTTPはステートレスであり、「閲覧中」をDBトランザクションで表現するとトランザクションの開きっぱなしが必要になる。
- Vercel + Supabaseのサーバーレス構成ではリクエストをまたぐトランザクション維持が物理的に不可能。

**実装方式:**

- `Application`(申請)テーブルに `version Int @default(1)` を持つ。
- 承認/差戻しの更新時は `updateMany` で `WHERE id = ? AND version = ?` を条件にし、`version` をインクリメントする。
- 更新件数が0件なら「他の承認者が先に処理した」と判断し、ユーザーにエラーを返す(二重承認の防止)。

```typescript
// 承認処理の基本パターン
const result = await prisma.application.updateMany({
  where: { id, version: expectedVersion, status: "PENDING" },
  data: { status: newStatus, version: { increment: 1 } },
});
if (result.count === 0) {
  throw new ConflictError("他のユーザーが先に処理しました。画面を更新してください。");
}
```

### 4-2. 閲覧ロック(擬似ロック)は任意の追加機能

「他の承認者が確認中です」の表示が必要になった場合のみ、`locked_by` + `locked_at`(有効期限付き、例: 5分)のアプリケーションレベルのロックで実装する。DBの行ロックは使わない。MVPでは実装しない。

### 4-3. 状態遷移はコードで一元管理する

申請のステータスは有限状態機械(FSM)として扱う。**遷移の可否判定を各所に散らばらせず、1つのモジュールに集約する。**

```
DRAFT(下書き)
  → SUBMITTED(申請済み) : 申請者がsubmit
SUBMITTED / IN_REVIEW(承認中)
  → IN_REVIEW : 中間承認者が承認(次ステップへ)
  → APPROVED(承認済み) : 最終承認者が承認
  → REJECTED(差戻し) : 承認者が差戻し
  → WITHDRAWN(取り下げ) : 申請者が取り下げ(最終承認前のみ)
REJECTED
  → SUBMITTED : 申請者が修正して再申請(新しい版として扱う)
APPROVED / WITHDRAWN
  → (終端状態。いかなる遷移も不可)
```

- 遷移ルールは `domain/application-status.ts` に定義し、Server Actionは必ずこれを経由する。
- 不正な遷移(例: APPROVED → REJECTED)はドメイン層で例外を投げる。UIの出し分けに頼らない。

### 4-4. 認可はサーバー側で必ず検証する

- 「承認ボタンを表示しない」はUXであり、セキュリティではない。
- すべてのServer Action / Route Handlerの先頭で「このユーザーはこの申請のこのステップの承認者か?」をDBで検証する。
- 申請の閲覧権限: 申請者本人・承認ルート上の承認者のみ(MVPでは管理者ロールは任意)。

---

## 5. データモデル(エンティティの骨格)

```
User            … 利用者。Auth.jsと連携
ApprovalRoute   … 承認ルートのテンプレート(名前を持つ)
RouteStep       … ルート内の承認ステップ(順序 order、承認者 userId)
Application     … 申請本体(status, version, currentStep, 申請者)
Attachment      … 添付PDF(Supabase StorageのパスをDBに保存)
ApprovalAction  … 承認/差戻しの履歴(誰が・いつ・どのステップで・何をしたか・コメント)
```

原則:

- **履歴(ApprovalAction)は追記のみ(append-only)。更新・削除しない。** 決裁システムの監査性の根幹。
- 申請時点の承認ルートは `Application` 側にスナップショットする(ルートテンプレートを後から編集しても過去の申請に影響させない)。MVPでは簡略化としてRouteStepの複製で実現してよい。
- 論理削除は使わない。取り下げは状態(WITHDRAWN)で表現する。

---

## 6. コーディング規約

### アーキテクチャ

- **Server Components をデフォルト**とし、インタラクションが必要な末端のみ `"use client"`。
- データ変更は **Server Actions** で行う。API Route Handlerは外部連携等で必要な場合のみ。
- ディレクトリ構成:

```
hanko-buster/
  app/            … ルーティングとページ(薄く保つ)
  components/     … UIコンポーネント(shadcn/uiは components/ui/)
  domain/         … 状態遷移・認可などのビジネスルール(Reactに依存しない純粋なTS)
  actions/        … Server Actions(入力検証 → 認可 → domain呼び出し → DB)
  lib/            … prismaクライアント、supabaseクライアント、ユーティリティ
  prisma/         … schema.prismaとmigrations
  docs/           … design.md
```

### 実装ルール

- すべての外部入力(フォーム、URLパラメータ)は **Zodでバリデーション**してから使う。Server Actionの引数を信用しない。
- `any` 禁止。型が不明な場合は `unknown` + 絞り込み。
- Prismaクライアントはシングルトン(`lib/prisma.ts`)。開発時のホットリロードで接続が増殖しないよう globalThis パターンを使う。
- エラーは握りつぶさない。ユーザー向けメッセージ(日本語)とログ用情報を分ける。
- 環境変数は `lib/env.ts` でZodによる起動時検証を行い、直接 `process.env` を散らばらせない。
- PDFアップロードは MIMEタイプ(`application/pdf`)とサイズ上限(例: 10MB)をサーバー側で検証する。Storageのパスは推測不能なものにする(uuid)。

### UI

- shadcn/uiのコンポーネントを優先して使い、独自CSSを最小化する。
- **shadcn/uiは導入済み**(2026-07)。必要なコンポーネントは `npx shadcn@latest add <name>` で `components/ui/` に生成する。
  - スタイルはbase-nova。プリミティブは **Radixではなく @base-ui/react**(現行shadcnの標準)。ネット上のRadix前提の古い記事に注意。
  - テーマ変数(oklch)は `app/globals.css`、クラス結合は `lib/utils.ts` の `cn()`。
  - 色はハードコード(`bg-zinc-*` 等)ではなくセマンティックトークン(`bg-primary`, `text-destructive`, `bg-muted` 等)を使う。
- 日本語UI。ステータス表示は色+テキストで(色だけに頼らない)。
- 楽観的ロックの競合エラーは「他のユーザーが先に処理しました」と明確に伝え、再読み込みを促す。

---

## 7. 開発の進め方

1. **実装前にER図と状態遷移図を確定させる**(このファイルの4-3と5が下敷き)。
2. 機能は縦切り(スキーマ → Server Action → UI)で1本ずつ完成させる。順序の目安:
   認証 → 申請CRUD(下書き) → PDF添付 → 承認ルート設定 → 申請提出 → 承認/差戻し → 履歴閲覧
3. コミットは機能単位・日本語メッセージ可。Conventional Commits(`feat:`, `fix:`, `refactor:`)を推奨。
4. テストはMVP完成後、**domain層(状態遷移・認可)から**書く。ここが最も価値が高くバグが致命的な場所。UIのテストは後回しでよい。

---

## 8. やらないことリスト(重要)

- 悲観的ロック / 長時間トランザクション
- マイクロサービス化、過剰なレイヤ分割、DIコンテナ導入
- MVPスコープ外の機能の先回り実装
- クライアント側だけの権限チェック
- 履歴レコードの更新・物理削除
- `any` の使用、バリデーションなしの外部入力の受け入れ
