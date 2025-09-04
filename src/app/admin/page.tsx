"use client";

import { useEffect, useMemo, useState } from "react";

type Tenant = {
  id: string;
  name: string | null;
  email: string;
  api_key?: string | null;
  credits?: number | null;
};

type FetchState = "idle" | "loading" | "success" | "error";

const SS_KEY = "gecorpid_admin_secret";

export default function AdminPage() {
  const [adminSecret, setAdminSecret] = useState<string>("");
  const [logged, setLogged] = useState(false);

  // Tenants
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [fetchTenantsState, setFetchTenantsState] = useState<FetchState>("idle");
  const [filter, setFilter] = useState("");

  // Create tenant form
  const [tName, setTName] = useState("");
  const [tEmail, setTEmail] = useState("");
  const [tPassword, setTPassword] = useState("");
  const [tCredits, setTCredits] = useState<number>(10);
  const [creating, setCreating] = useState<FetchState>("idle");
  const [createError, setCreateError] = useState<string>("");

  // Quick add credits
  const [targetTenantId, setTargetTenantId] = useState("");
  const [targetEmail, setTargetEmail] = useState("");
  const [deltaCredits, setDeltaCredits] = useState<number>(1);
  const [addingCredits, setAddingCredits] = useState<FetchState>("idle");
  const [creditsError, setCreditsError] = useState<string>("");

  // UI Toast
  const [toast, setToast] = useState<string>("");

  // Bootstrap from sessionStorage
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    const fromSS = typeof window !== "undefined" ? sessionStorage.getItem(SS_KEY) : null;
    if (fromSS) {
      setAdminSecret(fromSS);
      void tryLogin(fromSS);
    }
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps */

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  async function tryLogin(secret: string) {
    setFetchTenantsState("loading");
    try {
      const res = await fetch("/api/admin/list-tenants", {
        method: "GET",
        headers: {
          "x-admin-secret": secret,
        },
        cache: "no-store",
      });
      if (!res.ok) {
        if (res.status === 404) {
          setLogged(true);
          setFetchTenantsState("error");
          sessionStorage.setItem(SS_KEY, secret);
          showToast(
            "Logged in. /api/admin/list-tenants not found yet — you can still create tenants and add credits."
          );
          return;
        }
        const body = await res.text();
        throw new Error(body || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { tenants: Tenant[] };
      setTenants(data.tenants || []);
      setLogged(true);
      setFetchTenantsState("success");
      sessionStorage.setItem(SS_KEY, secret);
      showToast("Admin authenticated.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setFetchTenantsState("error");
      setLogged(false);
      showToast(`Login failed: ${message}`);
    }
  }

  async function onLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    await tryLogin(adminSecret.trim());
  }

  async function refreshTenants() {
    if (!logged) return;
    setFetchTenantsState("loading");
    try {
      const res = await fetch("/api/admin/list-tenants", {
        headers: { "x-admin-secret": adminSecret },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { tenants: Tenant[] };
      setTenants(data.tenants || []);
      setFetchTenantsState("success");
      showToast("Tenants refreshed.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setFetchTenantsState("error");
      showToast(`Refresh error: ${message}`);
    }
  }

  async function createTenant(e: React.FormEvent) {
    e.preventDefault();
    setCreating("loading");
    setCreateError("");
    try {
      // Enviamos claves "amigables" por compatibilidad:
      // - initial_credits y credits
      interface CreateTenantPayload {
        name: string | null;
        email: string;
        password: string;
        initial_credits: number;
        credits: number;
      }
      const payload: CreateTenantPayload = {
        name: tName || null,
        email: tEmail,
        password: tPassword,
        initial_credits: Number.isFinite(tCredits) ? tCredits : 0,
        credits: Number.isFinite(tCredits) ? tCredits : 0,
      };

      const res = await fetch("/api/admin/create-tenant", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-secret": adminSecret,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      setCreating("success");
      setTName("");
      setTEmail("");
      setTPassword("");
      setTCredits(10);
      showToast("Tenant created.");
      void refreshTenants();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setCreating("error");
      setCreateError(message);
    }
  }

  async function addCredits(e: React.FormEvent) {
    e.preventDefault();
    setAddingCredits("loading");
    setCreditsError("");
    try {
      const amount = Number(deltaCredits) || 0;

      // Compatibilidad: enviamos varias variantes de nombres
      interface AddCreditsPayload {
        credits: number;
        amount: number;
        delta: number;
        tenantId?: string;
        tenant_id?: string;
        email?: string;
      }
      const payload: AddCreditsPayload = {
        credits: amount, // usado por nuestro diseño
        amount, // alias común
        delta: amount, // alias común
      };
      if (targetTenantId.trim()) {
        payload.tenantId = targetTenantId.trim(); // camel
        payload.tenant_id = targetTenantId.trim(); // snake
      }
      if (targetEmail.trim()) payload.email = targetEmail.trim();

      const res = await fetch("/api/admin/add-credits", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-secret": adminSecret,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      setAddingCredits("success");
      showToast("Credits updated.");
      setTargetTenantId("");
      setTargetEmail("");
      setDeltaCredits(1);
      void refreshTenants();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setAddingCredits("error");
      setCreditsError(message);
    }
  }

  function maskKey(key?: string | null) {
    if (!key) return "—";
    if (key.length <= 8) return key;
    return `${key.slice(0, 4)}••••${key.slice(-4)}`;
  }

  async function copy(text?: string | null) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast("Copied.");
    } catch {
      showToast("Cannot copy on this browser.");
    }
  }

  function logout() {
    sessionStorage.removeItem(SS_KEY);
    setLogged(false);
    setTenants([]);
    setAdminSecret("");
    showToast("Logged out.");
  }

  const filteredTenants = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter((t) => {
      const hay = `${t.name || ""} ${t.email} ${t.id} ${t.api_key || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [filter, tenants]);

  if (!logged) {
    return (
      <main className="admin">
        <header className="top">
          <div className="brand">
            <span className="dot" aria-hidden />
            <span className="logo">GECORPID • VC — Admin</span>
          </div>
        </header>

        <section className="panel">
          <h1>Admin Login</h1>
          <p className="muted">
            Enter the <code>ADMIN_SECRET</code> to manage tenants and credits.
          </p>
          <form onSubmit={onLoginSubmit} className="form">
            <label>
              <span>ADMIN_SECRET</span>
              <input
                type="password"
                placeholder="••••••••••••••••••"
                value={adminSecret}
                onChange={(e) => setAdminSecret(e.target.value)}
                required
                autoFocus
              />
            </label>
            <button className="btn primary" disabled={!adminSecret}>
              {fetchTenantsState === "loading" ? "Checking..." : "Login"}
            </button>
          </form>
          {!!toast && <p className="toast">{toast}</p>}
        </section>

        <style jsx>{styles}</style>
      </main>
    );
  }

  return (
    <main className="admin">
      <header className="top">
        <div className="brand">
          <span className="dot" aria-hidden />
          <span className="logo">GECORPID • VC — Admin</span>
        </div>
        <div className="actions">
          <a href="/.well-known/did.json" className="muted small" style={{ textDecoration: "none" }}>
            did:web:gecorpid.com
          </a>
          <button className="btn ghost" onClick={refreshTenants}>
            {fetchTenantsState === "loading" ? "Refreshing..." : "Refresh"}
          </button>
          <button className="btn danger" onClick={logout}>Logout</button>
        </div>
      </header>

      <section className="grid">
        <article className="card">
          <h3>Create tenant</h3>
          <form onSubmit={createTenant} className="form">
            <label>
              <span>Name (optional)</span>
              <input value={tName} onChange={(e) => setTName(e.target.value)} placeholder="Acme Labs" />
            </label>
            <label>
              <span>Email</span>
              <input value={tEmail} onChange={(e) => setTEmail(e.target.value)} placeholder="admin@acme.com" required />
            </label>
            <label>
              <span>Password</span>
              <input value={tPassword} onChange={(e) => setTPassword(e.target.value)} placeholder="temporary password" required />
            </label>
            <label>
              <span>Initial credits</span>
              <input
                type="number"
                min={0}
                value={tCredits}
                onChange={(e) => setTCredits(parseInt(e.target.value || "0", 10))}
              />
            </label>
            <button className="btn primary">
              {creating === "loading" ? "Creating..." : "Create tenant"}
            </button>
            {createError && <p className="error">Error: {createError}</p>}
          </form>
        </article>

        <article className="card">
          <h3>Quick add credits</h3>
          <p className="muted small">
            Target by <b>tenantId</b> or <b>email</b>. Positive adds, negative subtracts.
          </p>
          <form onSubmit={addCredits} className="form">
            <label>
              <span>tenantId</span>
              <input
                value={targetTenantId}
                onChange={(e) => setTargetTenantId(e.target.value)}
                placeholder="e.g. 0f9f…"
              />
            </label>
            <label>
              <span>email</span>
              <input
                value={targetEmail}
                onChange={(e) => setTargetEmail(e.target.value)}
                placeholder="user@domain.com"
              />
            </label>
            <label>
              <span>Δ credits</span>
              <input
                type="number"
                value={deltaCredits}
                onChange={(e) => setDeltaCredits(parseInt(e.target.value || "0", 10))}
              />
            </label>
            <button className="btn primary">
              {addingCredits === "loading" ? "Updating..." : "Apply"}
            </button>
            {creditsError && <p className="error">Error: {creditsError}</p>}
          </form>
        </article>
      </section>

      <section className="tableWrap">
        <div className="tableTop">
          <h3>Tenants</h3>
          <input
            className="search"
            placeholder="Search by name, email, id, or api key…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        <div className="table">
          <div className="row head">
            <div>Name</div>
            <div>Email</div>
            <div>Tenant ID</div>
            <div>Credits</div>
            <div>API Key</div>
            <div>Actions</div>
          </div>

          {fetchTenantsState === "error" && (
            <div className="empty">
              <p>
                Couldn’t load tenants. If <code>/api/admin/list-tenants</code> isn’t implemented yet,
                you can still use “Create tenant” and “Quick add credits”.
              </p>
            </div>
          )}

          {fetchTenantsState !== "error" && filteredTenants.length === 0 && (
            <div className="empty">
              <p>No tenants to show.</p>
            </div>
          )}

          {filteredTenants.map((t) => (
            <div key={t.id} className="row">
              <div title={t.name || ""}>{t.name || "—"}</div>
              <div title={t.email}>{t.email}</div>
              <div title={t.id} className="mono">{t.id}</div>
              <div className="mono">{t.credits ?? "—"}</div>
              <div className="mono" title={t.api_key || ""}>{maskKey(t.api_key)}</div>
              <div className="actionsRow">
                <button className="btn tiny" onClick={() => copy(t.api_key || "")}>Copy key</button>
                <button
                  className="btn tiny ghost"
                  onClick={() => {
                    setTargetTenantId(t.id);
                    setTargetEmail("");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    showToast(`Target set to tenantId=${t.id}`);
                  }}
                >
                  Target
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {!!toast && <div className="toastFixed">{toast}</div>}

      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
:root{
  --bg:#0b0e14;
  --panel: rgba(255,255,255,0.06);
  --card: rgba(255,255,255,0.08);
  --text:#0f172a; /* set in light via media, but keep class names consistent */
  --text-dark:#e7eef7;
  --muted:#475569;
  --muted-dark:#b8c4d6;
  --accent:#4f8cff;
  --accent-2:#2e6dff;
  --ring:rgba(79,140,255,.45);
  --danger:#e5484d;
  --shadow:0 10px 30px rgba(0,0,0,.25);
  --radius:14px;
}
@media (prefers-color-scheme: light){
  :root{
    --bg:#f7f9fc; --panel: rgba(0,0,0,0.04); --card:#fff; --text:#0f172a; --muted:#475569;
    --accent:#3457d5; --accent-2:#2747c7; --ring:rgba(52,87,213,.35); --danger:#d11a2a;
    --shadow:0 10px 24px rgba(2,6,23,.06);
  }
}
*{box-sizing:border-box}
.admin{min-height:100svh; padding:24px; background:
  radial-gradient(1000px 600px at 20% -10%, rgba(79,140,255, .18), transparent 60%),
  radial-gradient(800px 500px at 95% 0%, rgba(79,140,255, .12), transparent 60%),
  var(--bg); color:var(--text)}
.top{display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 14px; border-radius:14px; background:var(--panel); box-shadow:var(--shadow);}
.brand{display:flex; align-items:center; gap:10px; font-weight:700}
.dot{width:10px;height:10px;border-radius:999px;background:linear-gradient(135deg,var(--accent),var(--accent-2)); box-shadow:0 0 0 6px var(--ring)}
.logo{font-size:15px}
.actions{display:flex; gap:10px; align-items:center}
.grid{display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; margin-top:16px}
@media (max-width: 900px){ .grid{grid-template-columns:1fr} }
.panel,.card{background:var(--card); border:1px solid rgba(255,255,255,.12); border-radius:14px; box-shadow:var(--shadow); padding:18px}
.panel h1{margin:0 0 8px 0}
.form{display:grid; gap:10px; margin-top:10px}
label{display:grid; gap:6px; font-size:14px}
input{height:42px; padding:0 12px; border-radius:10px; border:1px solid rgba(255,255,255,.18); background:transparent; color:inherit}
input::placeholder{opacity:.8}
.btn{display:inline-flex;align-items:center;justify-content:center;height:40px;padding:0 14px;border-radius:10px;border:1px solid transparent; box-shadow:var(--shadow)}
.btn.primary{background:linear-gradient(135deg,var(--accent),var(--accent-2)); color:#fff}
.btn.primary:disabled{opacity:.6}
.btn.ghost{background:transparent; border-color:rgba(255,255,255,.24)}
.btn.danger{background:transparent; color:#fff; border-color:var(--danger)}
.btn.tiny{height:30px; padding:0 10px; font-size:12px}
.muted{opacity:.8}
.small{font-size:13px}
.error{margin-top:8px; color:var(--danger); font-size:13px}
.tableWrap{margin-top:18px; background:var(--card); border:1px solid rgba(255,255,255,.12); border-radius:14px; box-shadow:var(--shadow); padding:12px}
.tableTop{display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:10px}
.search{height:38px; padding:0 12px; border-radius:10px; border:1px solid rgba(255,255,255,.18); background:transparent; width:260px}
.table{display:grid; gap:8px}
.row{display:grid; grid-template-columns: 1.2fr 1.6fr 1.6fr .8fr 1.4fr .9fr; gap:10px; align-items:center; padding:10px; border-radius:12px; background:rgba(255,255,255,.04)}
.row.head{font-weight:700; background:transparent; border:1px dashed rgba(255,255,255,.18)}
.row .mono{font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;}
.actionsRow{display:flex; gap:6px; justify-content:flex-end}
.empty{padding:14px; opacity:.8}
.toast,.toastFixed{opacity:.85; margin-top:8px}
.toastFixed{position:fixed; bottom:16px; left:50%; transform:translateX(-50%); background:var(--panel); border:1px solid rgba(255,255,255,.18); padding:8px 12px; border-radius:10px; box-shadow:var(--shadow)}
`;
