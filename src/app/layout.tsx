import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "GECORPID VC",
  description: "Verifiable Credentials for genetics providers",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased text-neutral-900">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <header className="mb-8">
            <nav className="flex items-center justify-between">
              <div className="font-semibold text-xl">GECORPID • VC</div>
              <div className="text-sm text-neutral-500">
                did:web:gecorpid.com
              </div>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
