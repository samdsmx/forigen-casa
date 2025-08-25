// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
serve(async (req)=>{
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); // service key
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { curp_or_name, sede_slug } = await req.json();
    // Detect if CURP-like
    const isCurp = typeof curp_or_name === "string" && /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(curp_or_name.toUpperCase());
    let results = [];
    if (isCurp) {
      const { data } = await supabase.from("beneficiario").select("id, curp, nombre, primer_apellido, fecha_nacimiento, sexo, beneficiario_sede ( sede_id )").eq("curp", curp_or_name.toUpperCase());
      results = data || [];
    } else {
      // Simple fuzzy-ish search by name prefix (tune later)
      const q = upper.replaceAll("%", "").replaceAll(",", "");
      const pattern = `%${q}%`;
      const { data, error } = await supabase.from("beneficiario").select("id, curp, nombre, primer_apellido, fecha_nacimiento, sexo, beneficiario_sede ( sede_id )").or(`nombre.ilike.${pattern},primer_apellido.ilike.${pattern}`);
      results = data || [];
    }
    // Map sede_id to slug for minimal disclosure
    const { data: sedes } = await supabase.from("sede").select("id, slug, nombre");
    const map = new Map((sedes || []).map((s)=>[
        s.id,
        s
      ]));
    const minimal = results.map((r)=>{
      const sedeIds = (r.beneficiario_sede || []).map((x)=>x.sede_id);
      const sedeObj = sedeIds.length ? map.get(sedeIds[0]) : null; // primera sede conocida
      return {
        id: r.id,
        curp: r.curp,
        nombre: r.nombre,
        primer_apellido: r.primer_apellido,
        fecha_nacimiento: r.fecha_nacimiento,
        sexo: r.sexo,
        sede_origen: sedeObj ? {
          slug: sedeObj.slug,
          nombre: sedeObj.nombre
        } : null
      };
    });
    return new Response(JSON.stringify({
      results: minimal
    }), {
      status: 200
    });
  } catch (e) {
    return new Response(JSON.stringify({
      error: String(e)
    }), {
      status: 500
    });
  }
});
