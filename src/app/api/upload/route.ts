// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

const BUCKET = "vcs";

type TenantRow = {
  id: string;
  email: string;
  api_key: string | null;
  is_active: boolean | null;
};

function readApiKey(req: NextRequest): string | null {
  const hdr = req.headers.get("x-api-key");
  if (hdr) return hdr.trim();
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return null;
}

export async function POST(req: NextRequest) {
  // --- ENV sanity
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    return NextResponse.json(
      { error: "Supabase env vars not configured." },
      { status: 500 }
    );
  }

  // --- Auth (apiKey)
  const apiKey = readApiKey(req);
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing API key (x-api-key or Authorization: Bearer)." },
      { status: 401 }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // --- Read multipart
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing PDF file" }, { status: 400 });
  }
  const pdfAb = await file.arrayBuffer();
  const pdfBuf = Buffer.from(pdfAb);

  // --- Resolve tenant & credits
  const tRes = await supabase
    .from("tenants")
    .select("id,email,api_key,is_active")
    .eq("api_key", apiKey)
    .maybeSingle();
  if (tRes.error) {
    return NextResponse.json({ error: tRes.error.message }, { status: 500 });
  }
  const tenant = tRes.data as unknown as TenantRow | null;
  if (!tenant || !tenant.id || tenant.is_active === false) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const cRes = await supabase
    .from("tenant_credits")
    .select("credits")
    .eq("tenant_id", tenant.id)
    .maybeSingle();
  if (cRes.error) {
    return NextResponse.json({ error: cRes.error.message }, { status: 500 });
  }
  const credits = (cRes.data as any)?.credits ?? 0;
  if (!credits || credits <= 0) {
    return NextResponse.json({ error: "No credits available" }, { status: 400 });
  }

  // --- Create file id & verify URL
  const fileId = crypto.randomUUID();
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin).replace(/\/$/, "");
  const verifyUrl = `${origin}/v/${fileId}`;

  // --- Produce QR as PNG (data URL -> bytes)
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 0, scale: 6 });
  const pngBase64 = qrDataUrl.split(",")[1];
  const pngBytes = Buffer.from(pngBase64, "base64");

  // --- Load PDF and draw QR + watermark on first page
  const pdfDoc = await PDFDocument.load(pdfBuf);
  const page = pdfDoc.getPages()[0]; // primera página
  const width = page.getWidth();
  const height = page.getHeight();

  const qrPng = await pdfDoc.embedPng(pngBytes);
  const qrSize = Math.min(130, Math.floor(Math.min(width, height) * 0.18)); // tamaño adaptativo
  const margin = 36;

  // Colocamos el QR arriba a la derecha y dejamos espacio para la leyenda debajo
  const qrX = width - margin - qrSize;
  const qrY = height - margin - qrSize - 16; // 16pts libres para el texto debajo
  page.drawImage(qrPng, { x: qrX, y: qrY, width: qrSize, height: qrSize });

  // --- Watermark: "developed by gecorp.com.ar" bajo el QR
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const label = "developed by gecorp.com.ar";
  const fontSize = 9;
  const textWidth = font.widthOfTextAtSize(label, fontSize);
  const textX = qrX + (qrSize - textWidth) / 2;
  const textY = Math.max(6, qrY - fontSize - 2); // bajo el QR, dentro de página
  page.drawText(label, {
    x: textX,
    y: textY,
    size: fontSize,
    font,
    color: rgb(0, 0, 0),
    opacity: 0.45, // efecto marca de agua
  });

  // (Opcional) Bordes suaves alrededor del QR para que se integre bien
  // page.drawRectangle({ x: qrX - 4, y: qrY - 4, width: qrSize + 8, height: qrSize + 8, borderColor: rgb(0,0,0), borderOpacity: 0.1, borderWidth: 0.6 });

  const processedPdfBytes = await pdfDoc.save();

  // --- Upload original & processed to Storage
  const originalPath = `${tenant.id}/originals/${fileId}.pdf`;
  const processedPath = `${tenant.id}/processed/${fileId}.pdf`;

  const upOriginal = supabase.storage.from(BUCKET).upload(originalPath, pdfBuf, {
    contentType: "application/pdf",
    upsert: false,
  });
  const upProcessed = supabase.storage.from(BUCKET).upload(processedPath, processedPdfBytes, {
    contentType: "application/pdf",
    upsert: false,
  });

  const [u1, u2] = await Promise.all([upOriginal, upProcessed]);
  if (u1.error) return NextResponse.json({ error: u1.error.message }, { status: 500 });
  if (u2.error) return NextResponse.json({ error: u2.error.message }, { status: 500 });

  // --- Insert file row
  const ins = await supabase.from("files").insert({
    id: fileId,
    tenant_id: tenant.id,
    original_path: originalPath,
    processed_path: processedPath,
  });
  if (ins.error) {
    // No abortamos: ya se subieron los archivos. Solo informamos.
    console.error("files insert error:", ins.error);
  }

  // --- Decrement credits (1)
  const upd = await supabase.rpc("decrement_tenant_credits", {
    p_tenant_id: tenant.id,
    p_amount: 1,
  }).catch(() => null);
  // Si no existe la función RPC, hacemos fallback con update atomico simple
  if (!upd || (upd as any)?.error) {
    await supabase
      .from("tenant_credits")
      .update({ credits: (credits as number) - 1 })
      .eq("tenant_id", tenant.id);
  }

  // --- Respond the processed PDF (download)
  return new NextResponse(Buffer.from(processedPdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${file.name.replace(/\.pdf$/i, "")}-qr.pdf"`,
      "X-File-Id": fileId,
      "Cache-Control": "no-store",
    },
  });
}
