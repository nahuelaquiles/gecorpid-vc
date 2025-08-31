"use client";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function TopBar() {
  async function signOut() {
    await supabaseBrowser().auth.signOut();
    window.location.href = "/";
  }
  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={() => (window.location.href = "/dashboard")}>Dashboard</Button>
      <Button variant="outline" onClick={() => (window.location.href = "/admin")}>Admin</Button>
      <Button onClick={signOut}>Salir</Button>
    </div>
  );
}
