"use client";

// 削除ボタン(確認ダイアログつき)
//
// "use client"にする理由: AlertDialogの開閉というインタラクションを持つため。
// 実際の削除処理自体はServer Action(deleteApplication)がサーバー側で行う。
import { deleteApplication } from "@/actions/application";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function DeleteApplicationButton({
  applicationId,
}: {
  applicationId: string;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="destructive">削除</Button>} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>この申請を削除しますか?</AlertDialogTitle>
          <AlertDialogDescription>
            削除すると元に戻せません。下書きの内容は完全に削除されます。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={deleteApplication.bind(null, applicationId)}>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction type="submit" variant="destructive">
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
