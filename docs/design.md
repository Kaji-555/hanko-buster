# hanko-buster 設計ドキュメント

CLAUDE.md のセクション 4-3(状態遷移)と 5(データモデル)を図に起こしたもの。

---

## 1. ER図

```mermaid
erDiagram
    User {
        string id PK
        string name
        string email UK
        string passwordHash
        datetime createdAt
    }

    ApprovalRoute {
        string id PK
        string name "ルート名(例: 経費申請ルート)"
        string createdById FK
        datetime createdAt
    }

    RouteStep {
        string id PK
        string routeId FK
        int order "承認順序(1,2,3...)"
        string approverId FK
    }

    Application {
        string id PK
        string title
        string body
        string status "DRAFT/SUBMITTED/IN_REVIEW/APPROVED/REJECTED/WITHDRAWN"
        int version "楽観的ロック用"
        int currentStepOrder "いま何番目の承認待ちか"
        string applicantId FK
        datetime createdAt
        datetime updatedAt
    }

    ApplicationStep {
        string id PK
        string applicationId FK
        int order "承認順序のスナップショット"
        string approverId FK
    }

    Attachment {
        string id PK
        string applicationId FK
        string fileName "元のファイル名"
        string storagePath "Supabase Storage上のパス(uuid)"
        int fileSize
        datetime createdAt
    }

    ApprovalAction {
        string id PK
        string applicationId FK
        string actorId FK
        int stepOrder "どのステップでの操作か"
        string action "APPROVE / REJECT"
        string comment
        datetime createdAt
    }

    User ||--o{ Application : "申請する"
    User ||--o{ ApprovalRoute : "作成する"
    User ||--o{ RouteStep : "承認者として指定される"
    User ||--o{ ApplicationStep : "承認者として指定される"
    User ||--o{ ApprovalAction : "実行する"
    ApprovalRoute ||--o{ RouteStep : "ステップを持つ"
    Application ||--o{ ApplicationStep : "ルートのスナップショットを持つ"
    Application ||--o{ Attachment : "PDFを添付する"
    Application ||--o{ ApprovalAction : "履歴を持つ"
```

### ER図のポイント

- **RouteStep と ApplicationStep は似ているが役割が違う。**
  RouteStep は「テンプレート」、ApplicationStep は「申請時点のコピー(スナップショット)」。
  申請後にテンプレートを編集しても、進行中・過去の申請には影響しない(CLAUDE.md 5)。
- **Application は ApprovalRoute への FK を持たない。**
  申請時に RouteStep を ApplicationStep へ複製した時点で、テンプレートとの縁は切れる。
  (「どのテンプレートから作ったか」を記録したければ nullable の参照を足してもよいが、MVPでは不要)
- **ApprovalAction は追記のみ(append-only)。** UPDATE / DELETE しない。監査性の根幹。
- **currentStepOrder** で「いま誰の承認待ちか」を判定する。
  承認待ち一覧 = 「自分が approver の ApplicationStep があり、その order が
  Application.currentStepOrder と一致し、status が承認待ちである申請」。

---

## 2. 状態遷移図

```mermaid
stateDiagram-v2
    [*] --> DRAFT : 申請者が作成

    DRAFT --> SUBMITTED : 申請者が提出\n(ルートをスナップショット)

    SUBMITTED --> IN_REVIEW : 中間承認者が承認\n(currentStepOrder+1)
    SUBMITTED --> APPROVED : 最終承認者が承認\n(1段ルートの場合)
    SUBMITTED --> REJECTED : 承認者が差戻し
    SUBMITTED --> WITHDRAWN : 申請者が取り下げ

    IN_REVIEW --> IN_REVIEW : 中間承認者が承認\n(currentStepOrder+1)
    IN_REVIEW --> APPROVED : 最終承認者が承認
    IN_REVIEW --> REJECTED : 承認者が差戻し
    IN_REVIEW --> WITHDRAWN : 申請者が取り下げ

    REJECTED --> SUBMITTED : 申請者が修正して再申請\n(currentStepOrderを1に戻す)

    APPROVED --> [*]
    WITHDRAWN --> [*]

    note right of APPROVED
        終端状態。
        いかなる遷移も不可
    end note
    note right of WITHDRAWN
        終端状態。
        いかなる遷移も不可
    end note
```

### 状態遷移のポイント

- **遷移の可否判定は `src/domain/application-status.ts` に一元化する**(CLAUDE.md 4-3)。
  UIでボタンを出し分けるだけでは防御にならない。
- 承認は「現在ステップの承認者本人」だけが実行できる。
- 差戻し(REJECTED)は途中のどのステップからでも可能で、再申請時はステップ1からやり直す。
- 取り下げ(WITHDRAWN)は申請者本人のみ、最終承認前のみ可能。
- DRAFT の削除は物理削除でよい(まだ誰の目にも触れていないため)。
  提出後の申請は削除せず状態で表現する(CLAUDE.md 8)。

---

## 3. 検討して決めた論点

1. **SUBMITTED と IN_REVIEW を分ける必要はあるか?**
   「1件も承認されていない」か「1件以上承認済み」かの違いだけなら、
   `PENDING` 1つに統合し currentStepOrder で表現する簡略化もあり得る。
   分けるメリット: 一覧での表示が分かりやすい。
   統合するメリット: 遷移パターンが減り実装が単純になる。
   今回は「自分の出した申請が、今どんな状況なのかわかりやすくする」というユーザー体験を重視し、分けることとする。
2. **同一ルート内に同じ承認者が2回登場するのを許すか?**
   MVPのためシンプルに禁止とする。
   多層防御の観点から、DBのユニーク制約(@@unique([routeId, approverId]))でも守る。
3. **再申請は同じ Application レコードを使い回すか、新規レコードにするか?**
   新規レコードのメリット: 「差戻し前の本文の内容」がそのまま残る。
   使い回しのメリット: データベースの中のデータが1個で済むので、システムが非常にシンプルで作りやすい。
   MVPに最適なのは使い回しと判断したため使い回しとする。
4. **ログイン形式はOAuthか、Credentialsにするか？**
   Auth.jsはCredentialsプロバイダを使うと、セッション戦略が実質JWT一択になる。(database戦略はCredentialsと組み合わせられない仕様)。
   hanko-busterは「社内の決裁システム」というペルソナのアプリです。この手の業務システムは管理者がアカウントを発行してID/パスワードで入るのが現実の姿なので、プロダクトの世界観と一致します。面談でのデモを考えても効きます——「申請者用と承認者用のデモアカウントを用意したので触ってみてください」ができる。GitHub OAuthだと面接官のGitHubアカウントに依存してしまい、複数ロールの切り替えデモもやりにくい。さらにUserテーブルに既にemail/passwordHashを持たせているので、スキーマとも整合します。