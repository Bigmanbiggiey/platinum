import { useLoaderData } from 'react-router-dom';
import { SeoHead } from '../components/ui/SeoHead';
import { Section } from '../components/ui/Section';
import { Prose } from '../components/ui/Prose';
import { getContentBlocks } from '../../shared/content/queries';

export async function privacyLoader() {
  const blocks = await getContentBlocks();
  return { body: blocks['privacy.body'] ?? '' };
}
type Data = Awaited<ReturnType<typeof privacyLoader>>;

export function PrivacyPage() {
  const { body } = useLoaderData() as Data;
  return (
    <>
      <SeoHead
        title="Privacy policy — Platinum Point Automotive Engineering"
        description="How Platinum Point handles the details you submit through this website."
        path="/privacy"
        noindex
      />
      <Section eyebrow="Legal" title="Privacy policy" narrow>
        {body ? (
          <Prose markdown={body} />
        ) : (
          <p className="text-[color:var(--color-muted)]">Privacy policy is being finalised.</p>
        )}
      </Section>
    </>
  );
}
