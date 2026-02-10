import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <h1 className="text-6xl font-bold text-brand mb-4">404</h1>
      <h2 className="text-2xl font-semibold mb-2">Page Not Found</h2>
      <p className="text-muted-foreground mb-8">The page you are looking for does not exist.</p>
      <Link
        href="/"
        className="rounded-lg bg-brand px-6 py-3 text-sm font-medium text-white hover:bg-brand-hover transition-colors"
      >
        Go Home
      </Link>
    </div>
  );
}
