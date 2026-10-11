import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
      <h1 className="text-3xl font-bold">Post and Stuff Mail</h1>
      <p className="text-lg text-muted-foreground">Check your mail from any phone or computer.</p>
      {/* Login pages arrive in Phase 2. */}
      <Button size="lg" className="h-14 text-lg" disabled>
        Log in (coming soon)
      </Button>
    </main>
  );
}
