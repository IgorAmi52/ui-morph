import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { CHART_COLORS } from '../../data/mockData';

interface BarChartProps {
  data: { category: string; count: number }[];
  dataKey?: string;
  labelKey?: string;
  height?: number;
  color?: string;
}

export default function CategoryBarChart({
  data,
  dataKey = 'count',
  labelKey = 'category',
  height = 260,
  color = CHART_COLORS.primary,
}: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey={labelKey} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }} />
        <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
