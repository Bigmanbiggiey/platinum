import { marked } from 'marked';

marked.setOptions({ gfm: true, breaks: false });

/**
 * Renders Markdown to HTML.
 *
 * Phase 2 content is **trusted seed data** loaded by migration — there is no
 * user-authored Markdown on the site (testimonial comments and form inputs render as
 * plain text, which React escapes). When the Phase 3 admin makes these fields
 * editable, add sanitisation (rehype-sanitize / DOMPurify) here.
 */
export function Prose({ markdown, className = '' }: { markdown: string; className?: string }) {
  const html = marked.parse(markdown ?? '', { async: false }) as string;
  return <div className={`prose ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
