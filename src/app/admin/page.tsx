import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';

async function requireAdmin() {
  const isAdmin = cookies().get('admin')?.value === 'ok';
  if (!isAdmin) return false;
  return true;
}

export default async function AdminPage() {
  const ok = await requireAdmin();
  if (!ok) {
    return (
      <div className="p-6">
        <p>No autorizado. <a className="underline" href="/admin/login">Ir a login</a></p>
      </div>
    );
  }

  const { data: tenants } = await supabaseAdmin
    .from('tenants').select('id, name, api_key, is_active, created_at');

  const { data: credits } = await supabaseAdmin
    .from('tenant_credits').select('tenant_id, credits');

  const creditMap: Record<string, number> =
    Object.fromEntries((credits||[]).map(c=>[c.tenant_id, c.credits]));

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Admin</h1>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Crear tenant</h2>
        <CreateTenantForm />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Tenants</h2>
        <div className="border rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">API Key</th>
                <th className="p-2">Credits</th>
                <th className="p-2">Add credits</th>
              </tr>
            </thead>
            <tbody>
              {(tenants||[]).map(t => (
                <tr key={t.id} className="border-t">
                  <td className="p-2">{t.name}</td>
                  <td className="p-2 font-mono text-xs">{t.api_key}</td>
                  <td className="p-2 text-center">{creditMap[t.id] ?? 0}</td>
                  <td className="p-2"><AddCreditsForm tenantId={t.id} /></td>
                </tr>
              ))}
              {(!tenants || tenants.length===0) && (
                <tr><td className="p-3" colSpan={4}>Sin tenants aún.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function CreateTenantForm() {
  return (
    <form
      className="flex gap-2 items-center"
      onSubmit={async (e) => {
        e.preventDefault();
        const name = (e.currentTarget as any).name.value;
        const initialCredits = Number((e.currentTarget as any).initialCredits.value || '0');
        const r = await fetch('/api/admin/create-tenant', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name, initialCredits }),
        });
        const j = await r.json();
        if (r.ok) { alert(`Tenant creado.\nAPI Key: ${j.apiKey}`); window.location.reload(); }
        else { alert(j.error || 'Error'); }
      }}
    >
      <input name="name" placeholder="Nombre" className="border rounded p-2" required />
      <input name="initialCredits" type="number" placeholder="Créditos iniciales" className="border rounded p-2 w-40" />
      <button className="border rounded px-3 py-2">Crear</button>
    </form>
  );
}

function AddCreditsForm({ tenantId }: { tenantId: string }) {
  return (
    <form
      className="flex gap-2 items-center"
      onSubmit={async (e) => {
        e.preventDefault();
        const amount = Number((e.currentTarget as any).amount.value || '0');
        const r = await fetch('/api/admin/add-credits', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ tenantId, amount }),
        });
        const j = await r.json();
        if (r.ok) { alert(`Créditos ahora: ${j.credits}`); window.location.reload(); }
        else { alert(j.error || 'Error'); }
      }}
    >
      <input name="amount" type="number" placeholder="+/-" className="border rounded p-2 w-28" />
      <button className="border rounded px-3 py-2">Actualizar</button>
    </form>
  );
}
