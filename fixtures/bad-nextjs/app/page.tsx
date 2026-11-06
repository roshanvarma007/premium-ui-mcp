export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-600 to-indigo-900 p-10">
      <img src="/hero.png" className="rounded-3xl shadow-2xl" />
      <h1 className="text-6xl font-sans">🤖 AI that works for you</h1>
      <div className="mt-[18px] rounded-full backdrop-blur-lg bg-white/5 p-[14px]" onClick={() => {}}>
        Try it free →
      </div>
    </main>
  );
}
