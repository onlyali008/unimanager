"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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

interface FdcResult {
  fdcId: number;
  description: string;
  brand: string | null;
  dataType: string;
  per100g: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  servingSize_g: number | null;
}

const MEAL_SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;

function scale(per100g: FdcResult["per100g"], portion: number) {
  const f = portion / 100;
  return {
    calories: String(Math.round(per100g.calories * f)),
    protein_g: String(Math.round(per100g.protein_g * f * 10) / 10),
    carbs_g: String(Math.round(per100g.carbs_g * f * 10) / 10),
    fat_g: String(Math.round(per100g.fat_g * f * 10) / 10),
  };
}

function MealFormInner() {
  const { submit, busy } = useEntrySubmit("nutrition");

  const [date, setDate] = useState(todayISO());
  const [slot, setSlot] = useState<string>("lunch");

  // FDC search state
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<FdcResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [picked, setPicked] = useState<FdcResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Entry fields (auto-filled from FDC, always editable)
  const [name, setName] = useState("");
  const [portion, setPortion] = useState("100");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  // Clear any pending debounced search on unmount.
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  async function runSearch(q: string) {
    try {
      const res = await fetch(`/api/fdc/search?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as {
        results?: FdcResult[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setResults(data.results ?? []);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Search failed");
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function onQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = value.trim();
    if (q.length < 3) {
      setResults([]);
      setSearching(false);
      setSearchError(null);
      return;
    }
    setSearching(true);
    setSearchError(null);
    debounceRef.current = setTimeout(() => runSearch(q), 400);
  }

  async function pick(result: FdcResult) {
    setPicked(result);
    setResults([]);
    setName(
      result.brand
        ? `${result.description} (${result.brand})`
        : result.description,
    );
    const startingPortion = result.servingSize_g ?? 100;
    setPortion(String(startingPortion));

    // Try the full /food/{fdcId} record for more accurate macros.
    let detail = result;
    try {
      const res = await fetch(`/api/fdc/food/${result.fdcId}`);
      if (res.ok) {
        const data = (await res.json()) as { food?: FdcResult };
        if (data.food) detail = { ...data.food, servingSize_g: result.servingSize_g ?? data.food.servingSize_g };
      }
    } catch {
      // Search-result macros are a fine fallback.
    }
    setPicked(detail);
    const macros = scale(detail.per100g, startingPortion);
    setCalories(macros.calories);
    setProtein(macros.protein_g);
    setCarbs(macros.carbs_g);
    setFat(macros.fat_g);
  }

  function onPortionChange(next: string) {
    setPortion(next);
    const grams = Number(next);
    if (picked && grams > 0) {
      const macros = scale(picked.per100g, grams);
      setCalories(macros.calories);
      setProtein(macros.protein_g);
      setCarbs(macros.carbs_g);
      setFat(macros.fat_g);
    }
  }

  function clearPick() {
    setPicked(null);
    setQuery("");
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    await submit(
      {
        date,
        meal: {
          name: name.trim(),
          meal: slot,
          portion_g: Number(portion),
          calories: Number(calories),
          protein_g: Number(protein),
          carbs_g: Number(carbs),
          fat_g: Number(fat),
          fdc_id: picked?.fdcId ?? null,
          source: picked ? "fdc" : "manual",
        },
      },
      "Meal logged",
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Search USDA FoodData Central" htmlFor="fdc-search">
        <div className="relative">
          <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          {picked ? (
            <div className="flex items-center gap-2 rounded-md border bg-muted/50 py-2 pr-2 pl-8 text-sm">
              <span className="min-w-0 flex-1 truncate">{name}</span>
              <Badge variant="secondary">FDC {picked.fdcId}</Badge>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={clearPick}
                aria-label="Clear food selection"
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : (
            <Input
              id="fdc-search"
              className="pl-8"
              placeholder="e.g. greek yogurt, banana, chicken breast…"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
            />
          )}
        </div>
        {searching ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" /> Searching…
          </p>
        ) : null}
        {searchError ? (
          <p className="text-xs text-destructive">{searchError}</p>
        ) : null}
      </Field>

      {results.length > 0 ? (
        <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-1">
          {results.slice(0, 10).map((result) => (
            <li key={result.fdcId}>
              <button
                type="button"
                onClick={() => pick(result)}
                className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <span className="block truncate">
                  {result.description}
                  {result.brand ? (
                    <span className="text-muted-foreground">
                      {" "}
                      — {result.brand}
                    </span>
                  ) : null}
                </span>
                <span className="text-xs text-muted-foreground">
                  {Math.round(result.per100g.calories)} kcal / 100 g ·{" "}
                  {result.dataType}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="text-xs text-muted-foreground">
        No good match? Just type a name below and fill the macros manually.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Food name" htmlFor="meal-name" className="col-span-2">
          <Input
            id="meal-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="What did you eat?"
          />
        </Field>
        <Field label="Date" htmlFor="meal-date">
          <Input
            id="meal-date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Field label="Meal">
          <Select value={slot} onValueChange={setSlot}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEAL_SLOTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s[0].toUpperCase() + s.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field
          label="Portion (g)"
          htmlFor="meal-portion"
          hint={picked ? "Macros rescale automatically." : undefined}
        >
          <Input
            id="meal-portion"
            type="number"
            min="1"
            step="1"
            required
            value={portion}
            onChange={(e) => onPortionChange(e.target.value)}
          />
        </Field>
        <Field label="Calories (kcal)" htmlFor="meal-cal">
          <Input
            id="meal-cal"
            type="number"
            min="0"
            step="1"
            required
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
          />
        </Field>
        <Field label="Protein (g)" htmlFor="meal-protein">
          <Input
            id="meal-protein"
            type="number"
            min="0"
            step="0.1"
            required
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
          />
        </Field>
        <Field label="Carbs (g)" htmlFor="meal-carbs">
          <Input
            id="meal-carbs"
            type="number"
            min="0"
            step="0.1"
            required
            value={carbs}
            onChange={(e) => setCarbs(e.target.value)}
          />
        </Field>
        <Field label="Fat (g)" htmlFor="meal-fat">
          <Input
            id="meal-fat"
            type="number"
            min="0"
            step="0.1"
            required
            value={fat}
            onChange={(e) => setFat(e.target.value)}
          />
        </Field>
      </div>

      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        Log meal
      </Button>
    </form>
  );
}

export function NutritionEntryButton() {
  return (
    <EntryDialog title="Log a meal" triggerLabel="Log meal">
      <MealFormInner />
    </EntryDialog>
  );
}
