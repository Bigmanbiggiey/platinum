import { Link } from 'react-router-dom';
import { Head } from 'vite-react-ssg';

export function NotFoundPage() {
  return (
    <>
      <Head>
        <title>Page not found — Platinum Point Automotive Engineering</title>
        <meta name="robots" content="noindex" />
      </Head>
      <section className="py-10">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-[color:var(--color-muted)]">
          404
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-[color:var(--color-ink)]">
          We couldn&rsquo;t find that page.
        </h1>
        <p className="mt-4 text-[color:var(--color-muted)]">
          <Link to="/" className="font-semibold">
            Back to home
          </Link>
        </p>
      </section>
    </>
  );
}
