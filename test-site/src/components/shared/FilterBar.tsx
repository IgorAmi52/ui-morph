import { ChevronDown } from 'lucide-react';

interface FilterBarProps {
  filters: string[];
  showApply?: boolean;
}

export default function FilterBar({ filters, showApply = true }: FilterBarProps) {
  return (
    <div className="filter-bar">
      {filters.map((f) => (
        <button key={f} type="button" className="filter-btn">
          {f}
          <ChevronDown size={14} />
        </button>
      ))}
      {showApply && (
        <>
          <button type="button" className="btn btn--dark">Apply</button>
          <button type="button" className="btn btn--link">Reset</button>
        </>
      )}
    </div>
  );
}
