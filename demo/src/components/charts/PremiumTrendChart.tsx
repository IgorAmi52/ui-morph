import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { CHART_COLORS } from '../../data/mockData';

interface PremiumTrendChartProps {
  data: { month: string; premiums: number; claims: number }[];
  height?: number;
}

export default function PremiumTrendChart({ data, height = 280 }: PremiumTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="premiumGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
            <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="claimsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS.secondary} stopOpacity={0.2} />
            <stop offset="95%" stopColor={CHART_COLORS.secondary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}M`} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}
          formatter={(value) => [`$${value}M`, '']}
        />
        <Legend />
        <Area type="monotone" dataKey="premiums" name="Premiums" stroke={CHART_COLORS.primary} fill="url(#premiumGrad)" strokeWidth={2} />
        <Area type="monotone" dataKey="claims" name="Claims paid" stroke={CHART_COLORS.secondary} fill="url(#claimsGrad)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
