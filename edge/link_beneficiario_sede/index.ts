
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; // service key
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { beneficiario_id, sede_slug } = await req.json();
    const { data: sedeRow } = await supabase.from("sede").select("id").eq("slug", sede_slug).single();
    if (!sedeRow) return new Response(JSON.stringify({ error: "Sede no encontrada" }), { status: 400 });

    const up = await supabase.from("beneficiario_sede").upsert({
      beneficiario_id,
      sede_id: sedeRow.id
    }, { onConflict: "beneficiario_id,sede_id" });

    if (up.error) throw up.error;

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
