import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

marked.setOptions({ gfm: true, breaks: false });

/**
 * Renders Markdown to sanitised HTML. Content is admin-authored from Phase 3 on, so
 * this must not trust it. DOMPurify runs identically in the browser and during the
 * SSG prerender (isomorphic-dompurify backs the server pass with jsdom), so the
 * static HTML we ship is sanitised by a real parser, not a regex. `USE_PROFILES`
 * limits output to HTML — SVG/MathML are dropped, which prose never needs.
 */
export function Prose({ markdown, className = '' }: { markdown: string; className?: string }) {
  const raw = marked.parse(markdown ?? '', { async: false }) as string;
  const html = DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
  return <div className={`prose ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
