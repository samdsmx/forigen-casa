# forigen-casa (MVP)

Supabase + Next.js (Vercel) MVP para captura en oficina (sin offline), con RLS y Edge Functions para flujos críticos.

## Estructura
```
supabase/
  schema.sql
  seed.sql
edge/
  alta_rapida_asistencia/index.ts
  search_curp/index.ts
  link_beneficiario_sede/index.ts
web/
  package.json
  next.config.js
  tsconfig.json
  postcss.config.js
  tailwind.config.js
  .env.example
  src/
    app/
      layout.tsx
      page.tsx
      login/page.tsx
      programas/page.tsx
      actividades/page.tsx
      asistencia/[actividadId]/page.tsx
    components/
      Navbar.tsx
      Protected.tsx
      Role.tsx
      Forms.tsx
    lib/
      supabaseClient.ts
      auth.ts
```

## Pasos de configuración

1) **Supabase**
   - Crear proyecto en **US-West** con nombre **forigen-casa**.
   - En `SQL editor` ► pega y corre `supabase/schema.sql` y luego `supabase/seed.sql`.
   - Crea tu cuenta **admin** (email: `samdsmx@gmail.com`) mediante **Auth** (o usando el enlace de "Invite" / "Users"). Tras crear al usuario, corre:
     ```sql
     -- Asigna el rol y sede al admin (sin sede específica para admin)
     insert into app_user (auth_user_id, role) 
     select id, 'admin' from auth.users where email = 'samdsmx@gmail.com'
     on conflict (auth_user_id) do update set role='admin';
     ```
   - **Edge Functions**: en la CLI de Supabase (o en el Dashboard si está habilitado) despliega cada función en `edge/`:
     ```bash
     supabase functions deploy alta_rapida_asistencia
     supabase functions deploy search_curp
     supabase functions deploy link_beneficiario_sede
     ```
     Asegúrate de exponerlas y permitir invocación desde el frontend.

2) **Vercel**
   - Importa `web/` como proyecto.
   - Variables de entorno (en Vercel y `.env.local`):
     ```env
     NEXT_PUBLIC_SUPABASE_URL= (tu URL de Supabase)
     NEXT_PUBLIC_SUPABASE_ANON_KEY= (tu ANON key)
     ```
   - Deploy.

3) **Primeros pasos en la app**
   - Inicia sesión con `samdsmx@gmail.com` (admin).
   - Verifica `Sedes` precargadas en la BD (`seed.sql`).
   - Crea usuarios (coordinadores/facilitadores) desde Supabase Auth y ejecútales el SQL:
     ```sql
     -- ejemplo para coordinador de sede 'nayarit'
     insert into app_user (auth_user_id, role, sede_id)
     select id, 'coordinador_sede', (select id from sede where slug='nayarit')
     from auth.users where email='coordinador@nayarit.org';
     ```

## Notas
- **RLS** activa desde el MVP. Admin/supervisor ven todo; coordinador/facilitador sólo su **sede**.
- **Flujos críticos** vía Edge Functions: alta rápida+asistencia, búsqueda global por CURP (datos mínimos), vincular beneficiario a sede.
- **Sin evidencias** y **sin reportes** en esta fase.
- **Fechas/horas**: se guardan **locales** (sin zona) en MVP (acordado).
- **CURP**: formato en mayúsculas; índice único cuando no sea NULL; se permiten provisionales sin CURP.

## Paleta/estilos
- Tokens en `tailwind.config.js`. Ajustar colores/tipografías cuando se confirme el manual.
- Por ahora, tipografías del sistema y una paleta neutra (verde/teal) inspirada en informes institucionales.
