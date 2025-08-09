'use client';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function VerifyPage() {
  const sp = useSearchParams();
  const vc = sp.get('vc') || '';
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    if (vc) QRCode.toDataURL(vc).then(setDataUrl).catch(()=>{});
  }, [vc]);

  return (
    <div className="p-6 space-y-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold">Verificar VC</h1>
      {vc ? (
        <>
          <p className="break-all text-sm border p-3 rounded">{vc}</p>
          {dataUrl && <img src={dataUrl} alt="QR" className="w-48 h-48" />}
        </>
      ) : (
        <p>Pasa un VC por query: <code>?vc=TOKEN_AQUI</code></p>
      )}
    </div>
  );
}
