import { NextRequest, NextResponse } from "next/server";

import { runRouterPipeline } from "@/lib/routerPipeline";

export async function POST(request: NextRequest): Promise<NextResponse> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 400 });
  }

  const result = await runRouterPipeline(rawBody);
  return NextResponse.json(result.body, { status: result.status });
}
