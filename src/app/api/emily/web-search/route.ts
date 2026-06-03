import { NextRequest, NextResponse } from "next/server";

interface BraveWebResult {
  title: string;
  url: string;
  description: string;
}

interface BraveSearchResponse {
  web?: { results?: BraveWebResult[] };
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { query, location, maxResults } = body;
  if (typeof query !== "string" || !query.trim()) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    console.error("[web-search] Missing BRAVE_SEARCH_API_KEY");
    return NextResponse.json({ error: "Search service not configured" }, { status: 500 });
  }

  const count = typeof maxResults === "number" ? Math.min(maxResults, 20) : 5;
  const params = new URLSearchParams({
    q: location ? `${query.trim()} ${location}` : query.trim(),
    count: String(count),
  });

  try {
    const res = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
      headers: {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": apiKey,
      },
    });

    if (!res.ok) {
      console.error("[web-search] Brave API error", res.status, await res.text());
      return NextResponse.json({ error: "Search request failed" }, { status: 502 });
    }

    const data = (await res.json()) as BraveSearchResponse;
    const results = (data.web?.results ?? []).map((r) => ({
      title: r.title,
      url: r.url,
      description: r.description,
    }));

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[web-search]", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
