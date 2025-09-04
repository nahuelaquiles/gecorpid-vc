"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type HistoryItem = {
  id: string;
  createdAt: string | null;
  originalPath: string | null;
  processedPath: string | null;
  originalUrl: string | null;
  processedUrl: string | null;
  verifyUrl: string;
};

type UploadItem = {
  id: string; // local id
  file: File;
  progress: number; // 0..100
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
  serverId?: string; // file id from API, if provided
  downloadUrl?: string; // object URL when API returns a PDF
};

const LS_KEYS = ["apiKey", "tenantId", "gecorpid_apiKey", "gecorpid_tenantId"];

function getFromLocalStorage(): { apiKey: string | null; tenantId: string | null } {
  if (typeof window === "undefined") return { apiKey: null, tenantId: null };
  let apiKey: string | null = null;
  let tenantId: string | null = null;
  for (const k of LS_KEYS) {
    const v = localStorage.getItem(k);
    if (v && !apiKey && k.toLowerCase().includes("apikey")) apiKey = v;
    if (v && !tenantId && k.toLowerCase().includes("tenant")) tenantId = v;
  }
  apiKey = apiKey || localStorage.getItem("apiKey");
  tenantId = tenantId || localStorage.getItem("tenantId");
  return { apiKey, tenantId };
}

export default function ClientPage() {
  const [{ apiKey, tenantId }, setAuth] = useState(getFromLocalStorage());
  const [credits, setCredits] = useState<number | null>(null);
  const [loadingCredits, setLoadingCredits] = useState(false);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [queue, setQueue] = useState<UploadItem[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setAuth(getFromLocalStorage());
  }, []);

  useEffect(() => {
    if (!apiKey) return;
    refreshCredits();
    refreshHistory();
  }, [apiKey]);

  async function refreshCredits() {
    if (!apiKey) return;
    setLoadingCredits(true);
    try {
      const res = await fetch("/api/credits", {
        headers: { "x-api-key": apiKey },
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok) setCredits(data.credits ?? 0);
      else throw new Error(data?.error || "Unable to load credits");
    } catch {
      setCredits(null);
    } finally {
      setLoadingCredits(false);
    }
  }

  async function refreshHistory() {
    if (!apiKey) return;
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/files/list?limit=20", {
        headers: { "x-api-key": apiKey },
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Unable to load files");
      setHistory(data.items || []);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }

  function onChooseFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    enqueue(files);
    if (inputRef.current) inputRef.current.value = "";
  }

  function enqueue(files: File[]) {
    if (!files.length) return;
    const pdfs = files.filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    const items: UploadItem[] = pdfs.map((f) => ({
      id: `${Date.now()}_${f.name}_${Math.random().toString(36).slice(2, 7)}`,
      file: f,
      progress: 0,
      status: "queued",
    }));
    setQueue((prev) => [...items, ...prev]); // newest on top
    setTimeout(() => runQueue(), 0);
  }

  async function uploadOne(item: UploadItem): Promise<UploadItem> {
    if (!apiKey) return { ...item, status: "error", error: "Missing apiKey" };

    return await new Promise<UploadItem>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload", true);
      xhr.setRequestHeader("x-api-key", apiKey);
      xhr.responseType = "blob"; // soporta PDF/binario o JSON como texto

      xhr.upload.onprogress = (ev) => {
        if (!ev.lengthComputable) return;
        const pct = Math.round((ev.loaded / ev.total) * 100);
        setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, progress: pct, status: "uploading" } : q)));
      };

      xhr.onload = async () => {
        const ok = xhr.status >= 200 && xhr.status < 300;
        const ct = (xhr.getResponseHeader("content-type") || "").toLowerCase();
        const blob = xhr.response as Blob;

        const fail = async (msg?: string) => {
          let text = msg;
          try {
            if (!text) text = await blob.text();
          } catch {}
          setQueue((prev) =>
            prev.map((q) => (q.id === item.id ? { ...q, status: "error", error: text || `HTTP ${xhr.status}`, progress: 100 } : q))
          );
          resolve({ ...item, status: "error", error: text || `HTTP ${xhr.status}`, progress: 100 });
        };

        if (!ok) return void (await fail());

        try {
          // Caso 1: el endpoint responde JSON (p. ej., { id, processedUrl })
          if (ct.includes("application/json")) {
            const text = await blob.text();
            const body = JSON.parse(text || "{}");
            const serverId = body?.id || body?.fileId || null;
            setQueue((prev) =>
              prev.map((q) => (q.id === item.id ? { ...q, status: "done", progress: 100, serverId } : q))
            );
            resolve({ ...item, status: "done", progress: 100, serverId });
            return;
          }

          // Caso 2: el endpoint responde un PDF procesado (binario)
          // Creamos un Object URL y disparamos descarga automática.
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          const base = item.file.name.replace(/\.pdf$/i, "");
          a.download = `${base}-qr.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          // guardamos el url por si el usuario quiere descargar de nuevo enseguida
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id ? { ...q, status: "done", progress: 100, downloadUrl: url } : q
            )
          );
          // liberar el blob después de un rato
          setTimeout(() => URL.revokeObjectURL(url), 60_000);
          resolve({ ...item, status: "done", progress: 100, downloadUrl: url });
        } catch (err: any) {
          await fail(err?.message);
        }
      };

      xhr.onerror = () => {
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: "error", error: "Network error", progress: 100 } : q
          )
        );
        resolve({ ...item, status: "error", error: "Network error", progress: 100 });
      };

      const fd = new FormData();
      fd.append("file", item.file, item.file.name);
      xhr.send(fd);
    });
  }

  const uploading = useMemo(() => queue.some((q) => q.status === "uploading"), [queue]);

  async function runQueue() {
    for (const qi of [...queue].reverse()) {
      if (qi.status !== "queued") continue;
      const updated = await uploadOne(qi);
      if (updated.status === "done") {
        await Promise.all([refreshCredits(), refreshHistory()]);
      }
    }
  }

  function onDrop(ev: React.DragEvent) {
    ev.preventDefault();
    const files = Array.from(ev.dataTransfer.files || []);
    enqueue(files);
  }
  function onDragOver(ev: React.DragEvent) {
    ev.preventDefault();
  }

  function clearFinished() {
    setQueue((prev) => prev.filter((q) => q.status !== "done" && q.status !== "error"));
  }

  function logout() {
    LS_KEYS.forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem("apiKey");
    localStorage.removeItem("tenantId");
    location.href = "/login";
  }

  if (!apiKey || !tenantId) {
    return (
      <main className="wrap">
        <header className="top">
          <div className="brand">
            <span className="dot" aria-hidden />
            <span className="logo">GECORPID • VC — Client</span>
          </div>
          <Link className="btn primary" href="/login">Go to Login</Link>
        </header>
        <section className="card">
          <h2>Not authenticated</h2>
          <p className="muted">Please log in to get your <code>apiKey</code> and <code>tenantId</code>.</p>
        </section>
        <style jsx>{styles}</style>
      </main>
    );
  }

  return (
    <main className="wrap" onDrop={onDrop} onDragOver={onDragOver}>
      <header className="top">
        <div className="brand">
          <span className="dot" aria-hidden />
          <span className="logo">GECORPID • VC — Client</span>
        </div>
        <div className="actions">
          <span className="badge">
            {loadingCredits ? "Credits: …" : `Credits: ${credits ?? "—"}`}
          </span>
          <button className="btn ghost" onClick={() => { refreshCredits(); refreshHistory(); }}>
            Refresh
          </button>
          <button className="btn danger" onClick={logout}>Logout</button>
        </div>
      </header>

      <section className="grid">
        <article className="card">
          <h3>Upload PDFs</h3>
          <p className="muted small">Drop PDFs here or choose files. Each upload consumes 1 credit.</p>

          <div className="drop">
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="application/pdf"
              onChange={onChooseFiles}
            />
            <button className="btn primary" onClick={() => inputRef.current?.click()}>
              Choose files
            </button>
          </div>

          {queue.length > 0 && (
            <>
              <div className="qhead">
                <strong>Queue</strong>
                <div className="qactions">
                  <button className="btn tiny ghost" onClick={runQueue} disabled={uploading}>Start</button>
                  <button className="btn tiny ghost" onClick={clearFinished}>Clear finished</button>
                </div>
              </div>
              <ul className="qlist">
                {queue.map((q) => (
                  <li key={q.id} className={`qitem ${q.status}`}>
                    <div className="row1">
                      <span className="name" title={q.file.name}>{q.file.name}</span>
                      <span className={`status ${q.status}`}>{q.status}</span>
                    </div>
                    <div className="bar">
                      <div className="fill" style={{ width: `${q.progress}%` }} />
                    </div>
                    {q.downloadUrl && q.status === "done" && (
                      <div className="again">
                        <a href={q.downloadUrl} download>
                          Download again
                        </a>
                      </div>
                    )}
                    {q.error && <div className="error">Error: {q.error}</div>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </article>

        <article className="card">
          <h3>History</h3>
          <p className="muted small">Latest files issued by this tenant.</p>

          {loadingHistory ? (
            <p className="muted">Loading…</p>
          ) : history.length === 0 ? (
            <p className="muted">No files yet.</p>
          ) : (
            <div className="table">
              <div className="thead">
                <div>ID</div>
                <div>Verify</div>
                <div>Original</div>
                <div>With QR</div>
              </div>
              {history.map((it) => (
                <div className="trow" key={it.id}>
                  <div className="mono">{it.id}</div>
                  <div><a href={it.verifyUrl} target="_blank" rel="noreferrer">/v/{it.id}</a></div>
                  <div>{it.originalUrl ? <a href={it.originalUrl} target="_blank" rel="noreferrer">open</a> : "—"}</div>
                  <div>{it.processedUrl ? <a href={it.processedUrl} target="_blank" rel="noreferrer">open</a> : "—"}</div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
:root{
  --bg:#0b0e14; --panel: rgba(255,255,255,0.06); --card: rgba(255,255,255,0.08);
  --text:#e7eef7; --muted:#b8c4d6; --accent:#4f8cff; --accent-2:#2e6dff;
  --ring:rgba(79,140,255,.45); --danger:#e5484d; --shadow:0 10px 30px rgba(0,0,0,.25);
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
.wrap{min-height:100svh; padding:24px; background:
  radial-gradient(1000px 600px at 20% -10%, rgba(79,140,255, .18), transparent 60%),
  radial-gradient(800px 500px at 95% 0%, rgba(79,140,255, .12), transparent 60%),
  var(--bg); color:var(--text)}
.top{display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 14px; border-radius:14px; background:var(--panel); box-shadow:var(--shadow);}
.brand{display:flex; align-items:center; gap:10px; font-weight:700}
.dot{width:10px;height:10px;border-radius:999px;background:linear-gradient(135deg,var(--accent),var(--accent-2)); box-shadow:0 0 0 6px var(--ring)}
.logo{font-size:15px}
.actions{display:flex; gap:10px; align-items:center}
.badge{padding:6px 10px; border-radius:999px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.18)}
.grid{display:grid; grid-template-columns:1.2fr .8fr; gap:16px; margin-top:16px}
@media (max-width: 1000px){ .grid{grid-template-columns:1fr} }
.card{background:var(--card); border:1px solid rgba(255,255,255,.12); border-radius:14px; box-shadow:var(--shadow); padding:18px}
h3{margin:0 0 8px 0}
.muted{color:var(--muted)}
.small{font-size:13px}
.btn{display:inline-flex;align-items:center;justify-content:center;height:40px;padding:0 14px;border-radius:10px;border:1px solid transparent; box-shadow:var(--shadow)}
.btn.primary{background:linear-gradient(135deg,var(--accent),var(--accent-2)); color:#fff}
.btn.ghost{background:transparent; border-color:rgba(255,255,255,.24)}
.btn.danger{background:transparent; color:#fff; border-color:var(--danger)}
.drop{display:flex; gap:10px; align-items:center}
.drop input[type=file]{display:none}
.qlist{list-style:none; padding:0; margin:10px 0 0 0; display:grid; gap:10px}
.qitem{padding:10px; border-radius:10px; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.12)}
.qitem .row1{display:flex; align-items:center; justify-content:space-between; gap:10px}
.qitem .name{white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:60ch}
.status{font-size:12px; opacity:.8}
.status.uploading{color:#fff}
.status.done{color:#a2f39b}
.status.error{color:#ff7a7a}
.bar{height:8px; background:rgba(255,255,255,.08); border-radius:999px; overflow:hidden; margin-top:6px}
.fill{height:100%; background:linear-gradient(90deg,var(--accent),var(--accent-2))}
.error{margin-top:6px; color:var(--danger); font-size:12px}
.again{margin-top:6px; font-size:13px}
.qhead{display:flex; align-items:center; justify-content:space-between; margin-top:10px}
.qactions{display:flex; gap:8px}
.table{display:grid; gap:8px; margin-top:8px}
.thead,.trow{display:grid; grid-template-columns: 1.6fr 1fr .8fr .8fr; gap:10px; align-items:center}
.thead{font-weight:700; border:1px dashed rgba(255,255,255,.18); padding:8px; border-radius:10px}
.trow{padding:8px; border-radius:10px; background:rgba(255,255,255,.05)}
.mono{font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;}
`;
