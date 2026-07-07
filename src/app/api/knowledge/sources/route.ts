import { NextRequest, NextResponse } from "next/server";

import {
  loadSources,
  saveSources,
  suggestedSubjects,
  type KnowledgeSources,
} from "@/lib/ai/knowledge/sources";

export const runtime = "nodejs";

export async function GET() {
  const [sources, suggested] = await Promise.all([
    loadSources(),
    suggestedSubjects(),
  ]);
  return NextResponse.json({ sources, suggested });
}

export async function PUT(request: NextRequest) {
  let body: Partial<KnowledgeSources>;
  try {
    body = (await request.json()) as Partial<KnowledgeSources>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const saved = await saveSources({
    subjects: body.subjects ?? [],
    urls: body.urls ?? [],
    feeds: body.feeds ?? [],
    articlesPerSubject: body.articlesPerSubject ?? 4,
  });
  return NextResponse.json({ sources: saved });
}
