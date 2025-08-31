import Link from "next/link";

export default function Home() {
  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", padding: "1rem" }}>
      <h1>GECORPID — VC Demo</h1>
      <p>Elegí una acción:</p>
      <ul>
        <li><Link href="/issue">Emitir credencial</Link></li>
        <li><Link href="/verify">Verificar credencial</Link></li>
      </ul>
    </main>
  );
}
