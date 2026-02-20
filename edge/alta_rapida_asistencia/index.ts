
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; // service key for RLS bypass where needed
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { actividad_id, curp, provisional, beneficiario, sede_slug } = await req.json();

    // Lookup sede_id from slug
    const { data: sedeRow } = await supabase.from("sede").select("id").eq("slug", sede_slug).single();
    if (!sedeRow) return new Response(JSON.stringify({ error: "Sede no encontrada" }), { status: 400 });
    const sede_id = sedeRow.id;

    // 1) Beneficiario: find or create
    let beneficiario_id: string | null = null;
    if (curp && curp.trim().length > 0) {
      const { data: existing } = await supabase.from("beneficiario").select("id").eq("curp", curp.toUpperCase()).maybeSingle();
      if (existing) {
        beneficiario_id = existing.id;
      } else {
        // Alta por CURP con datos mínimos
        const min = beneficiario || {};
        const payload = {
          curp: curp.toUpperCase(),
          nombre: min.nombre,
          primer_apellido: min.primer_apellido,
          segundo_apellido: min.segundo_apellido ?? null,
          fecha_nacimiento: min.fecha_nacimiento,
          sexo: min.sexo,
          poblacion_indigena: min.poblacion_indigena ?? null,
          lengua_indigena: min.lengua_indigena ?? null,
          condicion_migrante: min.condicion_migrante ?? null,
          escolaridad: min.escolaridad ?? null,
          estado_clave: min.estado_clave ?? null,
          municipio_id: min.municipio_id ?? null,
          codigo_postal: min.codigo_postal ?? null,
          localidad_colonia: min.localidad_colonia ?? null,
        };
        const ins = await supabase.from("beneficiario").insert(payload).select("id").single();
        if (ins.error) throw ins.error;
        beneficiario_id = ins.data.id;
      }
    } else if (provisional) {
      const min = beneficiario || {};
      const payload = {
        curp: null, // provisional sin CURP
        nombre: min.nombre,
        primer_apellido: min.primer_apellido,
        segundo_apellido: min.segundo_apellido ?? null,
        fecha_nacimiento: min.fecha_nacimiento,
        sexo: min.sexo,
        poblacion_indigena: min.poblacion_indigena ?? null,
        lengua_indigena: min.lengua_indigena ?? null,
        condicion_migrante: min.condicion_migrante ?? null,
        escolaridad: min.escolaridad ?? null,
        estado_clave: min.estado_clave ?? null,
        municipio_id: min.municipio_id ?? null,
        codigo_postal: min.codigo_postal ?? null,
        localidad_colonia: min.localidad_colonia ?? null,
      };
      const ins = await supabase.from("beneficiario").insert(payload).select("id").single();
      if (ins.error) throw ins.error;
      beneficiario_id = ins.data.id;
    } else {
      return new Response(JSON.stringify({ error: "CURP requerida si no es provisional" }), { status: 400 });
    }

    // 2) Asociar beneficiario a la sede (si no existía)
    const bs = await supabase
      .from("beneficiario_sede")
      .upsert({ beneficiario_id, sede_id }, { onConflict: "beneficiario_id,sede_id" });
    if (bs.error) throw bs.error;

    // 3) Registrar asistencia (única por actividad x beneficiario)
    const as = await supabase
      .from("asistencia")
      .insert({ actividad_id, beneficiario_id })
      .select("id")
      .single();
    if (as.error) {
      // Si es unique violation, devolver OK idempotente
      if ((as.error as any).code === "23505") {
        return new Response(JSON.stringify({ ok: true, note: "Asistencia ya registrada" }), { status: 200 });
      }
      throw as.error;
    }

    return new Response(JSON.stringify({ ok: true, asistencia_id: as.data.id }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
