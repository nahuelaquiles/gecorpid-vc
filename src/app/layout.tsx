// src/app/layout.tsx
import './globals.css';
import { ReactNode } from 'react';
import Link from 'next/link';

// Global layout for the Next.js app. This component wraps all pages and
// defines the document structure. It deliberately omits any visible
// branding or DID text in the header to satisfy the requirement that
// the landing page should not display legacy banners like "GECORPID • VC"
// or the DID string. Instead, individual pages are responsible for
// rendering their own navigation or headers. A machine-readable link to
// the issuer's DID document is still included in the head for
// discoverability.

export const metadata = {
  title: 'GecorpID VC',
  description: 'Verifiable PDFs, made simple.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Machine-readable DID link for verifiers; not rendered visually */}
        <link rel="did" href="/.well-known/did.json" />
      </head>
      <body className="min-h-screen antialiased text-neutral-900 bg-[#f6f7fb] flex flex-col">
        {/* Page content */}
        <div className="flex-1">
          <div className="max-w-6xl mx-auto px-4 py-6">{children}</div>
        </div>

        {/* Global footer with legal links and invoicing note */}
        <footer className="border-t bg-white">
          <div className="max-w-6xl mx-auto w-full px-4 py-6 flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-6 justify-between">
            <div className="text-sm text-neutral-600">
              © {new Date().getFullYear()} <span className="font-semibold">GecorpID</span>.{' '}
              <Link
                href="/.well-known/did.json"
                className="underline underline-offset-4 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-800 rounded"
              >
                Issuer DID
              </Link>
              .
            </div>

            <nav className="text-sm flex items-center gap-4">
              <Link
                href="/terms"
                className="underline underline-offset-4 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-800 rounded"
              >
                Terms of Service
              </Link>
              <Link
                href="/privacy"
                className="underline underline-offset-4 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-800 rounded"
              >
                Privacy Policy
              </Link>
            </nav>

            <div className="text-sm text-neutral-600">
              GecorpID is a product by{' '}
              <a
                href="https://www.gecorp.com.ar"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-800 rounded"
              >
                GECORP
              </a>{' '}
              (invoicing entity).
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
