// Seiten der Anmeldung: zentrierte Karte, ohne Seitenleiste und Tab-Leiste.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-sm items-center justify-center px-4 py-8">
      {children}
    </main>
  )
}
