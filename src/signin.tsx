"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginBox() {
  const s = supabaseBrowser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin"|"signup">("signin");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      if (mode === "signin") {
        const { error } = await s.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await s.auth.signUp({ email, password });
        if (error) throw error;
      }
      window.location.href = "/dashboard";
    } catch (err: any) {
      setMsg(err?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-neutral-200 p-5 bg-white shadow-soft">
      <div className="grid gap-3">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <Label htmlFor="password">Contraseña</Label>
        <Input id="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        {msg && <div className="text-sm text-red-600">{msg}</div>}
        <div className="flex items-center gap-2 pt-2">
          <Button type="submit" disabled={loading}>{mode==="signin"?"Entrar":"Crear cuenta"}</Button>
          <Button type="button" variant="outline" onClick={()=>setMode(mode==="signin"?"signup":"signin")}>
            {mode==="signin"?"Registrarme":"Ya tengo cuenta"}
          </Button>
        </div>
      </div>
    </form>
  );
}
