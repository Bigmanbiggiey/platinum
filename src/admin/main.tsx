import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AdminApp } from './AdminApp';
import '../index.css';

/**
 * Client-only entry for the admin (`admin.html`, served for `/admin/*` by vercel.json
 * and the dev/preview middleware in vite.config.ts).
 *
 * The public entry (src/main.tsx) always hydrates prerendered HTML; mounting the admin
 * there made a hard load of /admin hydrate over the Home page's markup (React #418).
 * Here the root is empty and rendered from scratch, so there is nothing to mismatch.
 */
createRoot(document.getElementById('root')!).render(
  <BrowserRouter future={{ v7_startTransition: true }}>
    <Routes>
      <Route path="/admin/*" element={<AdminApp />} />
    </Routes>
  </BrowserRouter>,
);
