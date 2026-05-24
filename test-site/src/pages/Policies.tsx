import { Download } from 'lucide-react';
import PageHeader from '../components/shared/PageHeader';
import FilterBar from '../components/shared/FilterBar';
import SearchBar from '../components/shared/SearchBar';
import DataTable from '../components/shared/DataTable';
import Pagination from '../components/shared/Pagination';
import { PolicyStatusBadge, PolicyTypeBadge } from '../components/insurance/Badges';
import { policies } from '../data/mockData';
import '../components/insurance/Badges.css';

export default function Policies() {
  return (
    <>
      <PageHeader
        title="Policies"
        badge="12,847 active"
        subtitle="Manage and review all insurance policies."
        actions={
          <button type="button" className="btn btn--primary">
            <Download size={16} />
            Export
          </button>
        }
      />
      <FilterBar filters={['Policy type', 'Status', 'Coverage range', 'Renewal date']} />
      <div className="toolbar">
        <span />
        <SearchBar placeholder="Search by policy ID or holder" shortcut="⌘ K" inline />
      </div>
      <div className="card">
        <DataTable
          bare
          data={policies}
          getRowKey={(p) => p.id}
          columns={[
            { key: 'id', header: 'Policy ID', sortable: true, render: (p) => p.id, className: 'td-mono' },
            {
              key: 'holder',
              header: 'Policyholder',
              render: (p) => (
                <>
                  <div className="customer-cell__name">{p.holder}</div>
                  <div className="customer-cell__email">{p.email}</div>
                </>
              ),
            },
            { key: 'type', header: 'Type', render: (p) => <PolicyTypeBadge type={p.type} /> },
            { key: 'premium', header: 'Premium/mo', sortable: true, render: (p) => `$${p.premium.toFixed(2)}` },
            { key: 'coverage', header: 'Coverage', render: (p) => `$${p.coverage.toLocaleString()}`, className: 'td-muted' },
            { key: 'status', header: 'Status', render: (p) => <PolicyStatusBadge status={p.status} /> },
            { key: 'renewal', header: 'Renewal', render: (p) => p.renewalDate, className: 'td-muted' },
          ]}
        />
        <Pagination />
      </div>
    </>
  );
}
