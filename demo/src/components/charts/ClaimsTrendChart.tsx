import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { CHART_COLORS } from '../../data/mockData';

interface ClaimsTrendChartProps {
  data: { month: string; filed: number; resolved: number }[];
  height?: number;
}

export default function ClaimsTrendChart({ data, height = 280 }: ClaimsTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }} />
        <Legend />
        <Line type="monotone" dataKey="filed" name="Filed" stroke={CHART_COLORS.warning} strokeWidth={2} dot={{ r: 4 }} />
        <Line type="monotone" dataKey="resolved" name="Resolved" stroke={CHART_COLORS.success} strokeWidth={2} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
