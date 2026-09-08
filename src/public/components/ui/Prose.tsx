import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ gfm: true, breaks: false });

/** Server-safe fallback strip for the SSG prerender (no DOM for DOMPurify). */
function stripDangerous(html: string): string {
  return html
    .replace(/<\s*(script|iframe|object|embed|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|iframe|object|embed|style|link|meta)[^>]*>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1=$2#$2');
}

/**
 * Renders Markdown to sanitised HTML. Content is admin-authored from Phase 3 on, so
 * this must not trust it: DOMPurify in the browser, a conservative regex strip during
 * the SSG prerender.
 */
export function Prose({ markdown, className = '' }: { markdown: string; className?: string }) {
  const raw = marked.parse(markdown ?? '', { async: false }) as string;
  const html = typeof window === 'undefined' ? stripDangerous(raw) : DOMPurify.sanitize(raw);
  return <div className={`prose ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
