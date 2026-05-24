import { Download, UserPlus } from 'lucide-react';
import PageHeader from '../components/shared/PageHeader';
import SearchBar from '../components/shared/SearchBar';
import DataTable from '../components/shared/DataTable';
import Pagination from '../components/shared/Pagination';
import { TierBadge } from '../components/insurance/Badges';
import { customers } from '../data/mockData';
import '../components/insurance/Badges.css';

export default function Customers() {
  return (
    <>
      <PageHeader
        title="Customers"
        badge="8,420 total"
        subtitle="View policyholder profiles, tiers, and premium history."
        actions={
          <>
            <button type="button" className="btn btn--ghost">
              <Download size={16} />
              Export
            </button>
            <button type="button" className="btn btn--primary">
              <UserPlus size={16} />
              Add customer
            </button>
          </>
        }
      />
      <div className="toolbar">
        <span />
        <SearchBar placeholder="Search by name or email" shortcut="⌘ K" inline />
      </div>
      <div className="card">
        <DataTable
          bare
          data={customers}
          getRowKey={(c) => c.id}
          columns={[
            { key: 'id', header: 'Customer ID', render: (c) => c.id, className: 'td-mono' },
            {
              key: 'name',
              header: 'Name',
              render: (c) => (
                <>
                  <div className="customer-cell__name">{c.name}</div>
                  <div className="customer-cell__email">{c.email}</div>
                </>
              ),
            },
            { key: 'phone', header: 'Phone', render: (c) => c.phone, className: 'td-muted' },
            { key: 'policies', header: 'Policies', render: (c) => c.policies },
            { key: 'tier', header: 'Tier', render: (c) => <TierBadge tier={c.tier} /> },
            { key: 'premium', header: 'Total premium/mo', sortable: true, render: (c) => `$${c.totalPremium.toFixed(2)}` },
            { key: 'since', header: 'Customer since', render: (c) => c.since, className: 'td-muted' },
          ]}
        />
        <Pagination />
      </div>
    </>
  );
}
