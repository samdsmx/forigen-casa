# Checklist de Estabilidad para Supabase y Vercel

Basado en la arquitectura de Next.js + Supabase, aquí tienes puntos clave para revisar y asegurar que la aplicación sea estable y rápida.

## Supabase (Base de Datos & Auth)

1. **Índices en Tablas Clave:**
   - Asegúrate de que las columnas usadas en filtros (`where`) tengan índices.
   - En tu caso, revisa `app_user(auth_user_id)`:
     ```sql
     CREATE INDEX IF NOT EXISTS idx_app_user_auth_id ON app_user(auth_user_id);
     ```
   - Revisa también claves foráneas como `programa_id` en `actividad` o `beneficiario`.

2. **Políticas RLS (Row Level Security):**
   - **Evita la recursión infinita:** Si usas funciones auxiliares (`user_role()`, `user_sede_id()`) dentro de las políticas, asegúrate de que estas funciones sean `SECURITY DEFINER` y que *no* consulten tablas que a su vez las llamen.
   - **Performance:** Las políticas complejas se ejecutan por *cada fila*. Manténlas simples. Si tienes políticas que hacen `select * from otra_tabla`, considera desnormalizar datos o usar `claims` en el token JWT si es posible (avanzado).

3. **Timeouts y Pgbouncer:**
   - En la configuración de conexión de Supabase, asegúrate de usar el puerto **6543** (transaction pooler / IPv4) en lugar del 5432 directo para entornos serverless (Vercel), ya que Vercel abre muchas conexiones efímeras.
   - Si tienes muchos usuarios simultáneos, el pooler es obligatorio.

## Vercel (Frontend & Serverless Functions)

1. **Funciones Serverless:**
   - Next.js en Vercel corre como funciones lambda. Tienen un tiempo de ejecución máximo (por defecto 10s o 15s en plan gratuito/pro).
   - Asegúrate de que ninguna consulta a base de datos tarde más de 1-2 segundos.
   - Si una página tarda mucho, Vercel cortará la conexión y verás errores 504 Gateway Timeout.

2. **Cold Starts:**
   - La primera vez que alguien entra después de un rato, la función "despierta". Esto añade latencia.
   - Mover la lógica de sesión al cliente (como hicimos con `UserContext`) ayuda a que la página cargue el "esqueleto" rápido (HTML estático) y luego llene los datos, mejorando la percepción de velocidad.

3. **Variables de Entorno:**
   - Verifica en el dashboard de Vercel que `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` estén correctas en todos los entornos (Preview, Production).

## Código (Lo que acabamos de mejorar)

1. **Centralización del Estado:**
   - Al usar `UserContext`, evitamos que Navbar, Dashboard y Protected pregunten lo mismo 3 veces a Supabase al mismo tiempo. Esto reduce la carga en la base de datos a 1/3.

2. **Manejo de Errores Silenciosos:**
   - Antes, si `auth.getUser()` fallaba en el Dashboard, simplemente retornaba y dejaba todo en 0.
   - Ahora, el `UserContext` maneja el estado globalmente y `Protected` redirige si no hay sesión, o el Dashboard muestra un error explícito si falla la carga de datos.

3. **Eliminación de Polling:**
   - Se eliminó el `setInterval` de 60 segundos que buscaba versiones nuevas. Esto reduce el uso de red y evita comportamientos extraños si la red es inestable.
