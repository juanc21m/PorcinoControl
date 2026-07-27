// Edge Function: admin-users
//
// Crea y elimina usuarios de Supabase Auth. Vive en el SERVIDOR porque necesita
// la llave `service_role`, que jamás debe estar en el frontend: quien la tenga
// puede saltarse RLS y controlar toda la base de datos.
//
// Seguridad: además de la llave, la función verifica con el JWT del llamante que
// quien pide la operación tenga rol 'Admin' en la tabla `profiles`. Sin eso,
// cualquier usuario autenticado podría crear administradores.
//
// Despliegue (una sola vez, desde la raíz del proyecto):
//   supabase functions deploy admin-users
//   supabase secrets set SERVICE_ROLE_KEY=<tu service_role key>
//
// SUPABASE_URL viene inyectada automáticamente en el entorno de la función.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  // 1) Identificar al llamante con su propio JWT (nunca con la service_role).
  const authHeader = req.headers.get('Authorization') ?? '';
  const asCaller = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userErr } = await asCaller.auth.getUser();
  if (userErr || !user) return json({ error: 'No autenticado.' }, 401);

  // 2) Verificar que el llamante sea Admin.
  const { data: me } = await asCaller
    .from('profiles').select('role, status').eq('id', user.id).maybeSingle();
  if (me?.role !== 'Admin' || me?.status !== 'Activo') {
    return json({ error: 'Solo un administrador activo puede gestionar usuarios.' }, 403);
  }

  // 3) Cliente privilegiado (solo después de autorizar).
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Cuerpo JSON inválido.' }, 400);
  }
  const action = String(body.action ?? '');

  if (action === 'create') {
    const email = String(body.email ?? '').trim().toLowerCase();
    const tempPassword = String(body.tempPassword ?? '');
    const role = body.role === 'Admin' ? 'Admin' : 'Operador';

    if (!email.includes('@')) return json({ error: 'Correo inválido.' }, 400);
    if (tempPassword.length < 8) return json({ error: 'La contraseña temporal debe tener 8+ caracteres.' }, 400);

    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // sin verificación por correo: entra de inmediato
    });
    if (error) return json({ error: error.message }, 400);

    // El trigger crea el perfil; aquí fijamos rol y el cambio de clave obligatorio.
    const { error: pErr } = await admin.from('profiles').upsert({
      id: created.user.id,
      email,
      role,
      status: 'Activo',
      must_change_password: true,
    }, { onConflict: 'id' });
    if (pErr) return json({ error: pErr.message }, 400);

    return json({ id: created.user.id });
  }

  if (action === 'delete') {
    const userId = String(body.userId ?? '');
    if (!userId) return json({ error: 'Falta userId.' }, 400);
    if (userId === user.id) return json({ error: 'No puedes eliminar tu propio usuario.' }, 400);

    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }

  return json({ error: `Acción no soportada: ${action}` }, 400);
});
