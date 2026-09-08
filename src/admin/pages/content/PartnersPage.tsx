import { PageTitle } from '../../components/ui';
import { InlineCrud, type FieldDef } from '../../components/InlineCrud';
import { partners } from '../../lib/resources';
import { ContentBackLink } from './ContentBackLink';

const fields: FieldDef[] = [
  { key: 'name', label: 'Name' },
  { key: 'type', label: 'Type', type: 'select', options: ['bodywork', 'garage', 'parts', 'other'] },
  { key: 'area', label: 'Area' },
  { key: 'note', label: 'Note' },
  { key: 'display_order', label: 'Order', type: 'number' },
  { key: 'is_published', label: 'Published?', type: 'checkbox' },
];

export function PartnersPage() {
  return (
    <section className="space-y-4">
      <PageTitle actions={<ContentBackLink />}>Partners</PageTitle>
      <InlineCrud
        resource={partners}
        fields={fields}
        blank={{ name: '', type: 'other', display_order: 100, is_published: true }}
      />
    </section>
  );
}
