'use client';
import { useState } from 'react';

export default function IssueTest() {
  const [apiKey, setApiKey] = useState('');
  const [subjectId, setSubjectId] = useState('did:example:holder-001');
  const [claims, setClaims] = useState('{"reportId":"RPT-0001","service":"GECORP Genetics"}');
  const [msg, setMsg] = useState<string>('');

  async function issue() {
    setMsg('Emitiendo...');
    try {
      const r = await fetch('/api/issue', {
        method: 'POST',
        headers: { 'content-type':'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({
          subjectId,
          vcType: ["GeneticReportVC"],
          claims: JSON.parse(claims),
          expiresInDays: 365
        })
      });
      const j = await r.json();
      setMsg(JSON.stringify(j, null, 2));
    } catch (e:any) {
      setMsg(String(e?.message||e));
    }
  }

  return (
    <div className="p-6 max-w-xl mx-auto space-y-3">
      <h1 className="text-xl font-semibold">Issue Test</h1>
      <input className="border rounded w-full p-2" placeholder="API Key"
             value={apiKey} onChange={e=>setApiKey(e.target.value)} />
      <input className="border rounded w-full p-2" placeholder="subjectId"
             value={subjectId} onChange={e=>setSubjectId(e.target.value)} />
      <textarea className="border rounded w-full p-2 h-32" value={claims}
                onChange={e=>setClaims(e.target.value)} />
      <button className="border rounded px-4 py-2" onClick={issue}>Emitir VC</button>
      <pre className="border rounded p-3 whitespace-pre-wrap text-sm">{msg}</pre>
    </div>
  );
}
