import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/alta_rapida_asistencia`;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type":"application/json",
      "Authorization": `Bearer ${anon}`,
      "apikey": anon
    },
    body: JSON.stringify(body)
  });

  const data = await resp.json();
  return NextResponse.json(data, { status: resp.status });
}
