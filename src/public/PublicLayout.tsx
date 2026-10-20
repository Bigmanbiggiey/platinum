import { useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { Head } from 'vite-react-ssg';
import { Nav } from './components/Nav';
import { Footer } from './components/Footer';
import { MobileContactBar } from './components/MobileContactBar';
import { CfAnalytics } from './components/CfAnalytics';
import { useFocusOnNavigate } from '../shared/lib/useFocusOnNavigate';

/** Public site shell: nav + <Outlet /> + footer + persistent mobile contact bar. */
export function PublicLayout() {
  // After moving to another page, start keyboard and screen-reader users on its content.
  const mainRef = useRef<HTMLElement>(null);
  useFocusOnNavigate(mainRef);

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

      {/* Bottom padding clears the fixed mobile contact bar, footer included. */}
      <div className="flex min-h-dvh flex-col pb-16 md:pb-0">
        <Nav />
        <main id="main" ref={mainRef} tabIndex={-1} className="flex-1 outline-none">
          <Outlet />
        </main>
        <Footer />
      </div>

      <MobileContactBar />
    </>
  );
}
