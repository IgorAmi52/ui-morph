interface Stat {
  label: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down';
}

export default function StatGrid({ stats }: { stats: Stat[] }) {
  return (
    <div className="stat-grid">
      {stats.map((s) => (
        <div key={s.label} className="stat-card">
          <div className="stat-card__label">{s.label}</div>
          <div className="stat-card__value">{s.value}</div>
          {s.change && (
            <div className={`stat-card__change stat-card__change--${s.trend ?? 'up'}`}>
              {s.change}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
