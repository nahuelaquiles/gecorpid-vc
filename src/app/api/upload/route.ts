// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Supabase (service role ⇒ sólo en servidor)
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

// Construye el origen del sitio para el link /v/{id}
function buildOrigin(req: NextRequest): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  const host = req.headers.get('host') ?? 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  return `${proto}://${host}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export async function POST(req: NextRequest) {
  try {
    // 1) Auth por API Key del tenant
    const apiKey = req.headers.get('x-api-key') ?? '';
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 400 });
    }

    const { data: tenant, error: tenantErr } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('api_key', apiKey)
      .single<{ id: string }>();

    if (tenantErr || !tenant) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // 2) Verificar créditos
    const { data: creditRow, error: creditsErr } = await supabaseAdmin
      .from('tenant_credits')
      .select('credits')
      .eq('tenant_id', tenant.id)
      .single<{ credits: number }>();

    if (creditsErr || !creditRow || creditRow.credits <= 0) {
      return NextResponse.json({ error: 'No credits available' }, { status: 403 });
    }

    // 3) Recibir archivo (multipart/form-data → field: "file")
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'File field "file" is required' }, { status: 400 });
    }
    if (!file.type?.includes('pdf')) {
      return NextResponse.json({ error: 'Only PDF is accepted' }, { status: 400 });
    }
    const pdfBuffer = Buffer.from(await file.arrayBuffer());

    // 4) Generar ID y URL de verificación
    const verificationId =
      (globalThis.crypto?.randomUUID?.() as string) || String(Date.now());
    const origin = buildOrigin(req);
    const verificationUrl = `${origin}/v/${verificationId}`;

    // 5) Crear QR (PNG)
    const qrPngBuffer = await QRCode.toBuffer(verificationUrl, { errorCorrectionLevel: 'M', margin: 0 });

    // 6) Incrustar QR + leyendas en el PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pngImage = await pdfDoc.embedPng(qrPngBuffer);
    const [firstPage] = pdfDoc.getPages();
    const { width } = firstPage.getSize();

    // >>> NUEVOS AJUSTES <<<
    // - QR aprox la mitad del tamaño anterior: 5% del ancho, min 21px, max 36px
    // - Mover un poco a la izquierda para evitar cortes (rightNudge)
    const targetSize = Math.min(36, Math.max(21, Math.floor(width * 0.05)));
    const scale = targetSize / Math.max(pngImage.width, pngImage.height);
    const qrW = pngImage.width * scale;
    const qrH = pngImage.height * scale;

    const margin = 10;
    const rightNudge = 12; // empuja a la izquierda
    const x = Math.max(margin, width - qrW - margin - rightNudge);

    // Leyendas
    const bottomLabel = 'developed by gecorp.com.ar';
    const topLabel = 'Original verifiable credential';
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 7; // el tamaño que confirmaste que se ve bien
    const labelGap = 6; // separación entre QR y la leyenda superior
    const labelHeight = fontSize + 2;

    // Colocación vertical: QR encima de la leyenda inferior
    const y = margin + labelHeight;

    // Dibuja el QR
    firstPage.drawImage(pngImage, { x, y, width: qrW, height: qrH });

    // Leyenda inferior (centrada bajo el QR, con clamp para que no se corte a la derecha)
    const bottomWidth = font.widthOfTextAtSize(bottomLabel, fontSize);
    const bottomX = clamp(x + (qrW - bottomWidth) / 2, margin, width - margin - bottomWidth);
    const bottomY = margin;
    firstPage.drawText(bottomLabel, {
      x: bottomX,
      y: bottomY,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
      opacity: 0.45,
    });

    // Leyenda superior (“original verifiable credential”) justo encima del QR
    const topWidth = font.widthOfTextAtSize(topLabel, fontSize);
    const topX = clamp(x + (qrW - topWidth) / 2, margin, width - margin - topWidth);
    const topY = y + qrH + labelGap;
    firstPage.drawText(topLabel, {
      x: topX,
      y: topY,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
      opacity: 0.55,
    });

    const processedBytes = await pdfDoc.save();

    // 7) Subir a Storage (bucket: "vcs")
    const originalPath = `${tenant.id}/originals/${verificationId}.pdf`;
    const processedPath = `${tenant.id}/processed/${verificationId}.pdf`;

    const bucket = supabaseAdmin.storage.from('vcs');
    const { error: up1 } = await bucket.upload(originalPath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    });
    if (up1) return NextResponse.json({ error: up1.message }, { status: 500 });

    const { error: up2 } = await bucket.upload(processedPath, processedBytes, {
      contentType: 'application/pdf',
      upsert: false,
    });
    if (up2) return NextResponse.json({ error: up2.message }, { status: 500 });

    // 8) Registrar en DB y descontar crédito
    const { error: insErr } = await supabaseAdmin.from('files').insert({
      id: verificationId,
      tenant_id: tenant.id,
      original_path: originalPath,
      processed_path: processedPath,
      created_at: new Date().toISOString(),
    });
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

    const newCredits = creditRow.credits - 1;
    const { error: updErr } = await supabaseAdmin
      .from('tenant_credits')
      .update({ credits: newCredits })
      .eq('tenant_id', tenant.id);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    // 9) Devolver el PDF procesado para descarga directa
    return new NextResponse(processedBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="document-with-qr.pdf"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Upload failed' }, { status: 500 });
  }
}
