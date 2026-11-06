import { BackendStatus } from "./backend-status";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Digital Security Assistant</h1>
        <p className="text-muted-foreground">
          What should I do now? A prototype for DNA × Since AI Hackathon 2026. The chat comes next.
        </p>
      </div>
      <BackendStatus />
    </main>
  );
}
