import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FFFBF2] text-zinc-900 p-6 text-center">
      <h1 className="text-4xl font-serif font-medium mb-3">Page Not Found</h1>
      <p className="text-sm text-zinc-600 mb-6">Sorry, we could not find the page you were looking for.</p>
      <Link href="/" className="rounded-full bg-zinc-950 text-white px-6 py-2.5 text-xs uppercase tracking-widest hover:bg-pink-600 transition-colors">
        Return Home
      </Link>
    </div>
  );
}
