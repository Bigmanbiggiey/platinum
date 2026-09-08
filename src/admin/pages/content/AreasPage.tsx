import { PageTitle } from '../../components/ui';
import { InlineCrud, type FieldDef } from '../../components/InlineCrud';
import { serviceAreas } from '../../lib/resources';
import { ContentBackLink } from './ContentBackLink';

const fields: FieldDef[] = [
  { key: 'name', label: 'Name' },
  { key: 'region', label: 'Region' },
  { key: 'note', label: 'Note' },
  { key: 'is_primary', label: 'Primary?', type: 'checkbox' },
  { key: 'display_order', label: 'Order', type: 'number' },
];

export function AreasPage() {
  return (
    <section className="space-y-4">
      <PageTitle actions={<ContentBackLink />}>Service areas</PageTitle>
      <InlineCrud
        resource={serviceAreas}
        fields={fields}
        blank={{ name: '', is_primary: false, display_order: 100 }}
      />
    </section>
  );
}
