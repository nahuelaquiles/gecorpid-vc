import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LoginBox from "./signin";

export default async function Page() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <main className="grid gap-8">
      <section className="grid md:grid-cols-2 gap-6 items-start">
        <div>
          <h1 className="text-3xl font-bold mb-3">Acceso a la consola</h1>
          <p className="text-neutral-600">
            Inicia sesión para emitir y verificar credenciales, gestionar créditos,
            y generar PDFs con QR incrustado.
          </p>
        </div>
        <LoginBox />
      </section>
    </main>
  );
}
