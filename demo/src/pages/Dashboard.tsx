import PageHeader from '../components/shared/PageHeader';
import StatGrid from '../components/shared/StatGrid';
import DataTable from '../components/shared/DataTable';
import PremiumTrendChart from '../components/charts/PremiumTrendChart';
import DonutChart from '../components/charts/DonutChart';
import { ClaimStatusBadge, PolicyTypeBadge } from '../components/insurance/Badges';
import {
  dashboardStats,
  premiumTrend,
  policyDistribution,
  claims,
} from '../data/mockData';
import '../components/insurance/Badges.css';

export default function Dashboard() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of policies, claims, and premium performance."
      />
      <StatGrid stats={dashboardStats} />
      <div className="chart-grid chart-grid--3">
        <div className="chart-card">
          <div className="chart-card__title">Premiums vs claims paid ($M)</div>
          <PremiumTrendChart data={premiumTrend} />
        </div>
        <div className="chart-card">
          <div className="chart-card__title">Policies by type</div>
          <DonutChart data={policyDistribution} />
        </div>
      </div>
      <DataTable
        title="Recent claims"
        data={claims.slice(0, 5)}
        getRowKey={(c) => c.id}
        columns={[
          { key: 'id', header: 'Claim ID', render: (c) => c.id, className: 'td-mono' },
          { key: 'holder', header: 'Policyholder', render: (c) => c.holder },
          { key: 'type', header: 'Type', render: (c) => <PolicyTypeBadge type={c.type} /> },
          { key: 'amount', header: 'Amount', render: (c) => `$${c.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
          { key: 'status', header: 'Status', render: (c) => <ClaimStatusBadge status={c.status} /> },
        ]}
      />
    </>
  );
}
