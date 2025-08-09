import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';

// Página del panel admin (Server Component)
export default async function AdminPage() {
  // Next 15: cookies() es async
  const cookieStore = await cookies();
  const ok = cookieStore.get('admin')?.value === 'ok';

  if (!ok) {
    return (
      <div className="p-6">
        <p>No autorizado. <a className="underline" href="/admin/login">Ir a login</a></p>
      </div>
    );
  }

  // Datos para la tabla
  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, name, api_key, is_active, created_at')
    .order('created_at', { ascending: false });

  const { data: credits } = await supabaseAdmin
    .from('tenant_credits')
    .select('tenant_id, credits');

  const creditMap: Record<string, number> =
    Object.fromEntries((credits ?? []).map((c) => [c.tenant_id, c.credits]));

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Admin</h1>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Crear tenant</h2>
        <CreateTenantForm />
        <p className="text-sm text-gray-500">
          Tras crear, la API Key aparecerá en la tabla de abajo para copiarla.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Tenants</h2>
        <div className="border rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">Nombre</th>
                <th className="p-2 text-left">API Key</th>
                <th className="p-2 text-center">Créditos</th>
                <th className="p-2 text-center">Agregar créditos</th>
              </tr>
            </thead>
            <tbody>
              {(tenants ?? []).map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="p-2">{t.name}</td>
                  <td className="p-2 font-mono text-xs break-all">{t.api_key}</td>
                  <td className="p-2 text-center">{creditMap[t.id] ?? 0}</td>
                  <td className="p-2">
                    <AddCreditsForm tenantId={t.id} />
                  </td>
                </tr>
              ))}
              {(!tenants || tenants.length === 0) && (
                <tr>
                  <td className="p-3" colSpan={4}>Sin tenants aún.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* ====== Server Actions (no JS del lado del cliente necesario) ====== */

// Crear tenant + asignar créditos iniciales
async function createTenantAction(formData: FormData) {
  'use server';
  const name = String(formData.get('name') ?? '');
  const initialCredits = Number(formData.get('initialCredits') ?? 0);

  if (!name) return;

  const apiKey = `KEY_${uuidv4()}`;

  const { data: t, error: e1 } = await supabaseAdmin
    .from('tenants')
    .insert({ name, api_key: apiKey })
    .select()
    .single();

  if (!e1 && t) {
    // crea registro de créditos (0 por defecto) y suma inicialCredits
    const { error: e2 } = await supabaseAdmin
      .from('tenant_credits')
      .upsert({ tenant_id: t.id, credits: initialCredits });
    if (e2) {
      // En caso de error, podrías loguearlo a futuro
    }
  }

  // Refresca la página para ver el nuevo tenant y su API Key
  revalidatePath('/admin');
}

// Sumar/restar créditos al tenant
async function addCreditsAction(formData: FormData) {
  'use server';
  const tenantId = String(formData.get('tenantId') ?? '');
  const amount = Number(formData.get('amount') ?? 0);
  if (!tenantId || Number.isNaN(amount)) return;

  const { data, error } = await supabaseAdmin
    .from('tenant_credits')
    .select('credits')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (!error) {
    const current = data?.credits ?? 0;
    const next = current + amount;

    await supabaseAdmin
      .from('tenant_credits')
      .upsert({ tenant_id: tenantId, credits: next });
  }

  revalidatePath('/admin');
}

/* ====== Formularios (HTML) que usan las Server Actions ====== */

function CreateTenantForm() {
  return (
    <form action={createTenantAction} className="flex gap-2 items-center">
      <input name="name" placeholder="Nombre" className="border rounded p-2" required />
      <input
        name="initialCredits"
        type="number"
        placeholder="Créditos iniciales"
        className="border rounded p-2 w-40"
        defaultValue={0}
      />
      <button className="border rounded px-3 py-2">Crear</button>
    </form>
  );
}

function AddCreditsForm({ tenantId }: { tenantId: string }) {
  return (
    <form action={addCreditsAction} className="flex gap-2 items-center">
      <input type="hidden" name="tenantId" value={tenantId} />
      <input
        name="amount"
        type="number"
        placeholder="+/-"
        className="border rounded p-2 w-28"
        defaultValue={1}
      />
      <button className="border rounded px-3 py-2">Actualizar</button>
    </form>
  );
}

