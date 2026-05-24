import { Download } from 'lucide-react';
import PageHeader from '../components/shared/PageHeader';
import DataTable from '../components/shared/DataTable';
import { reports } from '../data/mockData';

export default function Reports() {
  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Generate and download insurance performance reports."
        actions={
          <button type="button" className="btn btn--primary">
            <Download size={16} />
            Generate report
          </button>
        }
      />
      <DataTable
        data={reports}
        getRowKey={(r) => r.id}
        columns={[
          { key: 'id', header: 'Report ID', render: (r) => r.id, className: 'td-mono' },
          { key: 'name', header: 'Report name', render: (r) => r.name },
          { key: 'period', header: 'Period', render: (r) => r.period, className: 'td-muted' },
          { key: 'format', header: 'Format', render: (r) => r.format, className: 'td-muted' },
          { key: 'size', header: 'Size', render: (r) => r.size, className: 'td-muted' },
          { key: 'generated', header: 'Generated', render: (r) => r.generated, className: 'td-muted' },
        ]}
      />
    </>
  );
}
