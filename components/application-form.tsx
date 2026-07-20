"use client";

// 申請フォーム(新規作成・編集で共有)
//
// "use client"にする理由: useActionStateでエラー表示と送信中の
// ボタン無効化というインタラクションを持つため(login-form.tsxと同じ方針)。
import { useActionState } from "react";
import type { ApplicationFormState } from "@/actions/application";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ApplicationFormAction = (
  prevState: ApplicationFormState,
  formData: FormData
) => Promise<ApplicationFormState>;

type ApplicationFormProps = {
  action: ApplicationFormAction;
  submitLabel: string;
  defaultValues?: {
    title: string;
    body: string;
    applicationDate: string;
  };
};

export function ApplicationForm({
  action,
  submitLabel,
  defaultValues,
}: ApplicationFormProps) {
  const [state, formAction, isPending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">タイトル</Label>
        <Input
          id="title"
          name="title"
          required
          maxLength={100}
          defaultValue={defaultValues?.title}
          aria-invalid={!!state?.errors?.title}
        />
        {state?.errors?.title && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {state.errors.title[0]}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="body">本文</Label>
        <Textarea
          id="body"
          name="body"
          required
          maxLength={2000}
          rows={6}
          defaultValue={defaultValues?.body}
          aria-invalid={!!state?.errors?.body}
        />
        {state?.errors?.body && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {state.errors.body[0]}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="applicationDate">申請日</Label>
        <Input
          id="applicationDate"
          name="applicationDate"
          type="date"
          required
          defaultValue={
            defaultValues?.applicationDate ??
            new Date().toISOString().slice(0, 10)
          }
          aria-invalid={!!state?.errors?.applicationDate}
        />
        {state?.errors?.applicationDate && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {state.errors.applicationDate[0]}
          </p>
        )}
      </div>

      {state?.message && !state.errors && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "送信中..." : submitLabel}
      </Button>
    </form>
  );
}
