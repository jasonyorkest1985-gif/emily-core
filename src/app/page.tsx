import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-green-50 p-6 text-green-950">
      <div className="mx-auto max-w-md pt-12">
        <h1 className="text-3xl font-bold">Emily Core</h1>
        <p className="mt-3 text-lg">Angela&apos;s dashboard is ready.</p>
        <Link
          href="/dashboard"
          className="mt-6 block rounded-xl bg-green-700 px-5 py-4 text-center text-lg font-bold text-white"
        >
          Open Dashboard
        </Link>
      </div>
    </main>
  );
}
