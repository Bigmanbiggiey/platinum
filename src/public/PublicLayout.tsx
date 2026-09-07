import { Outlet } from 'react-router-dom';
import { Head } from 'vite-react-ssg';
import { Nav } from './components/Nav';
import { Footer } from './components/Footer';
import { MobileContactBar } from './components/MobileContactBar';
import { CfAnalytics } from './components/CfAnalytics';

/** Public site shell: nav + <Outlet /> + footer + persistent mobile contact bar. */
export function PublicLayout() {
  return (
    <>
      <Head>
        <html lang="en" />
      </Head>
      <CfAnalytics />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-[color:var(--color-ink)] focus:px-3 focus:py-2 focus:text-[color:var(--color-ground)]"
      >
        Skip to content
      </a>

      <div className="flex min-h-dvh flex-col">
        <Nav />
        <main id="main" className="flex-1 pb-16 md:pb-0">
          <Outlet />
        </main>
        <Footer />
      </div>

      <MobileContactBar />
    </>
  );
}
