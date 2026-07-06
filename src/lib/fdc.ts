/**
 * USDA FoodData Central client (server-only).
 * Docs: https://fdc.nal.usda.gov/api-guide — /foods/search + /food/{fdcId},
 * key passed as api_key query parameter.
 */

const FDC_BASE = "https://api.nal.usda.gov/fdc/v1";

// FDC nutrient numbers/ids for the four macros. Energy appears as id 1008
// (kcal) or, on newer Foundation records, as Atwater ids 2047/2048.
const ENERGY_IDS = [1008, 2047, 2048];
const PROTEIN_ID = 1003;
const FAT_ID = 1004;
const CARBS_ID = 1005;

export interface Per100g {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface FdcSearchResult {
  fdcId: number;
  description: string;
  brand: string | null;
  dataType: string;
  per100g: Per100g;
  /** Labelled serving size in grams, when FDC provides one. */
  servingSize_g: number | null;
}

function apiKey(): string {
  const key = process.env.USDA_API_KEY;
  if (!key) {
    throw new Error(
      "USDA_API_KEY is not set — add it to .env.local (free key: https://fdc.nal.usda.gov/api-key-signup)",
    );
  }
  return key;
}

interface RawSearchNutrient {
  nutrientId: number;
  value: number;
  unitName?: string;
}

function macrosFromSearchNutrients(
  nutrients: RawSearchNutrient[] | undefined,
): Per100g | null {
  if (!nutrients) return null;
  const find = (ids: number[]) =>
    nutrients.find((n) => ids.includes(n.nutrientId))?.value ?? null;
  const calories = find(ENERGY_IDS);
  if (calories === null) return null;
  return {
    calories,
    protein_g: find([PROTEIN_ID]) ?? 0,
    carbs_g: find([CARBS_ID]) ?? 0,
    fat_g: find([FAT_ID]) ?? 0,
  };
}

/**
 * Searches FDC by name. Zero-calorie stub records (plain water and the
 * like) are filtered out, per project requirements.
 */
export async function searchFoods(query: string): Promise<FdcSearchResult[]> {
  const url = new URL(`${FDC_BASE}/foods/search`);
  url.searchParams.set("api_key", apiKey());
  url.searchParams.set("query", query);
  url.searchParams.set("pageSize", "25");
  url.searchParams.set(
    "dataType",
    ["Foundation", "SR Legacy", "Branded"].join(","),
  );

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`FDC search failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as {
    foods?: Array<{
      fdcId: number;
      description: string;
      brandName?: string;
      brandOwner?: string;
      dataType: string;
      servingSize?: number;
      servingSizeUnit?: string;
      foodNutrients?: RawSearchNutrient[];
    }>;
  };

  const results: FdcSearchResult[] = [];
  for (const food of data.foods ?? []) {
    const per100g = macrosFromSearchNutrients(food.foodNutrients);
    // Filter 0-calorie stubs (e.g. plain water) and macro-less records.
    if (!per100g || per100g.calories <= 0) continue;
    results.push({
      fdcId: food.fdcId,
      description: food.description,
      brand: food.brandName ?? food.brandOwner ?? null,
      dataType: food.dataType,
      per100g,
      servingSize_g:
        food.servingSize && food.servingSizeUnit?.toLowerCase().startsWith("g")
          ? food.servingSize
          : null,
    });
  }
  return results;
}

/**
 * Full nutrient details for one food. Values are normalized to per-100g;
 * for Branded foods missing standard nutrients, label nutrients are
 * converted from per-serving to per-100g using the labelled serving size.
 */
export async function getFood(fdcId: number): Promise<FdcSearchResult | null> {
  const url = new URL(`${FDC_BASE}/food/${fdcId}`);
  url.searchParams.set("api_key", apiKey());

  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`FDC food lookup failed: ${res.status} ${res.statusText}`);
  }
  const food = (await res.json()) as {
    fdcId: number;
    description: string;
    brandName?: string;
    brandOwner?: string;
    dataType: string;
    servingSize?: number;
    servingSizeUnit?: string;
    foodNutrients?: Array<{
      nutrient?: { id: number };
      amount?: number;
    }>;
    labelNutrients?: {
      calories?: { value: number };
      protein?: { value: number };
      carbohydrates?: { value: number };
      fat?: { value: number };
    };
  };

  const servingSize_g =
    food.servingSize && food.servingSizeUnit?.toLowerCase().startsWith("g")
      ? food.servingSize
      : null;

  const find = (ids: number[]) =>
    food.foodNutrients?.find(
      (n) => n.nutrient && ids.includes(n.nutrient.id) && n.amount != null,
    )?.amount ?? null;

  let per100g: Per100g | null = null;
  const calories = find(ENERGY_IDS);
  if (calories !== null) {
    per100g = {
      calories,
      protein_g: find([PROTEIN_ID]) ?? 0,
      carbs_g: find([CARBS_ID]) ?? 0,
      fat_g: find([FAT_ID]) ?? 0,
    };
  } else if (food.labelNutrients?.calories && servingSize_g) {
    // Branded label values are per serving — convert to per 100 g.
    const scale = 100 / servingSize_g;
    per100g = {
      calories: (food.labelNutrients.calories.value ?? 0) * scale,
      protein_g: (food.labelNutrients.protein?.value ?? 0) * scale,
      carbs_g: (food.labelNutrients.carbohydrates?.value ?? 0) * scale,
      fat_g: (food.labelNutrients.fat?.value ?? 0) * scale,
    };
  }

  if (!per100g || per100g.calories <= 0) return null;

  return {
    fdcId: food.fdcId,
    description: food.description,
    brand: food.brandName ?? food.brandOwner ?? null,
    dataType: food.dataType,
    per100g,
    servingSize_g,
  };
}

/** Scales per-100g macros to a logged portion, rounded for the vault. */
export function scaleToPortion(per100g: Per100g, portion_g: number): Per100g {
  const f = portion_g / 100;
  const round1 = (n: number) => Math.round(n * 10) / 10;
  return {
    calories: Math.round(per100g.calories * f),
    protein_g: round1(per100g.protein_g * f),
    carbs_g: round1(per100g.carbs_g * f),
    fat_g: round1(per100g.fat_g * f),
  };
}
