"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useEntryDialogClose } from "./entry-dialog";

/** Posts an entry payload to /api/entries/[domain], with toast + refresh. */
export function useEntrySubmit(domain: string) {
  const router = useRouter();
  const close = useEntryDialogClose();
  const [busy, setBusy] = useState(false);

  async function submit(payload: unknown, successMessage: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/entries/${domain}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? `Save failed (${res.status})`);
      }
      toast.success(successMessage);
      close();
      router.refresh();
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { submit, busy };
}
