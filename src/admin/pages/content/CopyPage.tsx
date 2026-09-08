import { useEffect, useState } from 'react';
import { Button, Card, PageTitle, Spinner } from '../../components/ui';
import { MarkdownField } from '../../components/MarkdownField';
import { contentBlocks } from '../../lib/resources';
import { usePublish } from '../../lib/rebuild';
import { ContentBackLink } from './ContentBackLink';

export function CopyPage() {
  const list = contentBlocks.useList();
  const update = contentBlocks.useUpdate();
  const publish = usePublish();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (list.data) {
      setDrafts(Object.fromEntries(list.data.map((b) => [b.id, b.value_md])));
    }
  }, [list.data]);

  if (list.isLoading) return <Spinner />;

  return (
    <section className="space-y-4">
      <PageTitle actions={<ContentBackLink />}>Page copy</PageTitle>
      {publish.message && <p className="text-sm text-teal">{publish.message}</p>}
      {(list.data ?? []).map((b) => {
        const dirty = drafts[b.id] !== b.value_md;
        return (
          <Card key={b.id}>
            <p className="mb-1 text-sm font-semibold text-[color:var(--color-ink)]">{b.label}</p>
            <p className="mb-2 font-mono text-[10px] text-steel">{b.key}</p>
            <MarkdownField
              label=""
              value={drafts[b.id] ?? ''}
              onChange={(v) => setDrafts((d) => ({ ...d, [b.id]: v }))}
            />
            <Button
              className="mt-2"
              variant="accent"
              disabled={!dirty || update.isPending}
              onClick={async () => {
                await update.mutateAsync({ id: b.id, patch: { value_md: drafts[b.id] } });
                publish.trigger();
              }}
            >
              Save
            </Button>
          </Card>
        );
      })}
    </section>
  );
}
