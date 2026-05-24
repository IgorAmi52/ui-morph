import { Download, Plus } from 'lucide-react';
import PageHeader from '../components/shared/PageHeader';
import FilterBar from '../components/shared/FilterBar';
import SearchBar from '../components/shared/SearchBar';
import DataTable from '../components/shared/DataTable';
import Pagination from '../components/shared/Pagination';
import { ClaimStatusBadge, PolicyTypeBadge } from '../components/insurance/Badges';
import { claims } from '../data/mockData';
import '../components/insurance/Badges.css';

export default function Claims() {
  return (
    <>
      <PageHeader
        title="Claims"
        badge="342 open"
        subtitle="Track and process insurance claims across all policy types."
        actions={
          <>
            <button type="button" className="btn btn--ghost">
              <Download size={16} />
              Export
            </button>
            <button type="button" className="btn btn--primary">
              <Plus size={16} />
              File claim
            </button>
          </>
        }
      />
      <FilterBar filters={['Date filed', 'Claim type', 'Status', 'Amount range', 'Adjuster']} />
      <div className="toolbar">
        <span />
        <SearchBar placeholder="Search by claim ID or holder" shortcut="⌘ F" inline />
      </div>
      <div className="card">
        <DataTable
          bare
          data={claims}
          getRowKey={(c) => c.id}
          columns={[
            { key: 'id', header: 'Claim ID', sortable: true, render: (c) => c.id, className: 'td-mono' },
            { key: 'policy', header: 'Policy', render: (c) => c.policyId, className: 'td-mono' },
            {
              key: 'holder',
              header: 'Policyholder',
              render: (c) => (
                <>
                  <div className="customer-cell__name">{c.holder}</div>
                  <div className="customer-cell__email">{c.email}</div>
                </>
              ),
            },
            { key: 'type', header: 'Claim type', render: (c) => <PolicyTypeBadge type={c.type} /> },
            { key: 'amount', header: 'Amount', sortable: true, render: (c) => `$${c.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
            { key: 'filed', header: 'Filed', render: (c) => c.filedDate, className: 'td-muted' },
            { key: 'status', header: 'Status', render: (c) => <ClaimStatusBadge status={c.status} /> },
            { key: 'adjuster', header: 'Adjuster', render: (c) => c.adjuster, className: 'td-muted' },
          ]}
        />
        <Pagination />
      </div>
    </>
  );
}
