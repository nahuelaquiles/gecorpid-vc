// src/app/layout.tsx
import './globals.css';
import type { ReactNode } from 'react';
import Link from 'next/link';

/**
 * Root layout component. This file defines the HTML skeleton for
 * every page in the application. It intentionally avoids visible
 * branding in the header to keep pages lean; individual pages
 * supply their own headers. A machine‑readable DID link is
 * included for verifiers to discover the issuer’s DID document.
 */

export const metadata = {
  title: 'GecorpID VC',
  description: 'Verifiable PDFs made simple.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Machine‑readable DID link for external verifiers */}
        <link rel="did" href="/.well-known/did.json" />
      </head>
      <body className="min-h-screen antialiased text-neutral-900 bg-[#f6f7fb] flex flex-col">
        <div className="flex-1">{children}</div>
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
