"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { todayISO } from "@/lib/vault/dates";

import { EntryDialog } from "./entry-dialog";
import { Field } from "./field";
import { useEntrySubmit } from "./use-entry-submit";

const CATEGORIES = [
  "food",
  "transport",
  "housing",
  "tuition",
  "entertainment",
  "health",
  "income",
  "other",
] as const;

function TransactionFormInner() {
  const { submit, busy } = useEntrySubmit("finances");
  const [date, setDate] = useState(todayISO());
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("food");
  const [description, setDescription] = useState("");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const magnitude = Math.abs(Number(amount));
    await submit(
      {
        date,
        amount: kind === "expense" ? -magnitude : magnitude,
        category: kind === "income" ? "income" : category,
        description: description.trim(),
      },
      "Transaction added",
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date" htmlFor="fi-date">
          <Input
            id="fi-date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Field label="Type">
          <Select
            value={kind}
            onValueChange={(v) => setKind(v as "expense" | "income")}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="income">Income</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Amount (CAD)" htmlFor="fi-amount">
          <Input
            id="fi-amount"
            type="number"
            min="0.01"
            step="0.01"
            required
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        {kind === "expense" ? (
          <Field label="Category">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.filter((c) => c !== "income").map((c) => (
                  <SelectItem key={c} value={c}>
                    {c[0].toUpperCase() + c.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        ) : (
          <div />
        )}
        <Field label="Description" htmlFor="fi-desc" className="col-span-2">
          <Input
            id="fi-desc"
            required
            placeholder="e.g. Groceries at No Frills"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        Add transaction
      </Button>
    </form>
  );
}

export function FinancesEntryButton() {
  return (
    <EntryDialog title="Add a transaction" triggerLabel="Add transaction">
      <TransactionFormInner />
    </EntryDialog>
  );
}
