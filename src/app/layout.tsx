import "./globals.css";
import { ReactNode } from "react";

// Global layout for the Next.js app. This component wraps all pages and
// defines the document structure. It deliberately omits any visible
// branding or DID text in the header to satisfy the requirement that
// the landing page should not display legacy banners like "GECORPID • VC"
// or the DID string. Instead, individual pages are responsible for
// rendering their own navigation or headers. A machine‑readable link to
// the issuer's DID document is still included in the head for
// discoverability.

export const metadata = {
  title: "GecorpID VC",
  description: "Verifiable PDFs, made simple.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Machine‑readable DID link for verifiers; not rendered visually */}
        <link rel="did" href="/.well-known/did.json" />
      </head>
      <body className="min-h-screen antialiased text-neutral-900">
        <div className="max-w-6xl mx-auto px-4 py-6">{children}</div>
      </body>
    </html>
  );
}
