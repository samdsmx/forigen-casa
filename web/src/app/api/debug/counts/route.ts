import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";

export async function GET() {
  try {
    const [prog, act, ben, asis, sede] = await Promise.all([
      supabaseServer.from('programa').select('id', { count: 'exact', head: true }),
      supabaseServer.from('actividad').select('id', { count: 'exact', head: true }),
      supabaseServer.from('beneficiario').select('id', { count: 'exact', head: true }),
      supabaseServer.from('asistencia').select('id', { count: 'exact', head: true }),
      supabaseServer.from('sede').select('id', { count: 'exact', head: true }),
    ]);
    return NextResponse.json({
      ok: true,
      serverCounts: {
        programa: prog.count ?? 0,
        actividad: act.count ?? 0,
        beneficiario: ben.count ?? 0,
        asistencia: asis.count ?? 0,
        sede: sede.count ?? 0,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
