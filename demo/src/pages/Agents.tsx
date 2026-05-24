import { UserPlus } from 'lucide-react';
import PageHeader from '../components/shared/PageHeader';
import DataTable from '../components/shared/DataTable';
import { agents } from '../data/mockData';

export default function Agents() {
  return (
    <>
      <PageHeader
        title="Agents"
        subtitle="Manage insurance agents, regions, and workload distribution."
        actions={
          <button type="button" className="btn btn--primary">
            <UserPlus size={16} />
            Add agent
          </button>
        }
      />
      <DataTable
        data={agents}
        getRowKey={(a) => a.id}
        columns={[
          { key: 'id', header: 'Agent ID', render: (a) => a.id, className: 'td-mono' },
          { key: 'name', header: 'Name', render: (a) => a.name },
          { key: 'email', header: 'Email', render: (a) => a.email, className: 'td-muted' },
          { key: 'region', header: 'Region', render: (a) => a.region, className: 'td-muted' },
          { key: 'policies', header: 'Policies', sortable: true, render: (a) => a.policies },
          { key: 'claims', header: 'Active claims', render: (a) => a.claims },
          {
            key: 'status',
            header: 'Status',
            render: (a) => (
              <span className={`status status--${a.status === 'Active' ? 'success' : 'pending'}`}>
                {a.status}
              </span>
            ),
          },
        ]}
      />
    </>
  );
}
