import PageHeader from '../components/shared/PageHeader';
import StatGrid from '../components/shared/StatGrid';
import PremiumTrendChart from '../components/charts/PremiumTrendChart';
import CategoryBarChart from '../components/charts/CategoryBarChart';
import DonutChart from '../components/charts/DonutChart';
import ClaimsTrendChart from '../components/charts/ClaimsTrendChart';
import RegionChart from '../components/charts/RegionChart';
import {
  dashboardStats,
  premiumTrend,
  claimsByCategory,
  policyDistribution,
  claimsTrend,
  regionPerformance,
} from '../data/mockData';

export default function Analytics() {
  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="Deep dive into premiums, claims trends, and regional performance."
      />
      <StatGrid stats={dashboardStats} />
      <div className="chart-grid">
        <div className="chart-card">
          <div className="chart-card__title">Premium & claims trend ($M)</div>
          <PremiumTrendChart data={premiumTrend} />
        </div>
        <div className="chart-card">
          <div className="chart-card__title">Claims filed vs resolved</div>
          <ClaimsTrendChart data={claimsTrend} />
        </div>
      </div>
      <div className="chart-grid chart-grid--3">
        <div className="chart-card">
          <div className="chart-card__title">Claims by category</div>
          <CategoryBarChart data={claimsByCategory} />
        </div>
        <div className="chart-card">
          <div className="chart-card__title">Policy distribution</div>
          <DonutChart data={policyDistribution} />
        </div>
      </div>
      <div className="chart-card">
        <div className="chart-card__title">Regional performance</div>
        <RegionChart data={regionPerformance} />
      </div>
    </>
  );
}
