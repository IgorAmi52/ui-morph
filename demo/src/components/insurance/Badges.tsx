const policyStatus: Record<string, string> = {
  Active: 'badge--success',
  Pending: 'badge--pending',
  Expired: 'badge--warning',
  Cancelled: 'badge--danger',
};

const claimStatus: Record<string, string> = {
  Paid: 'badge--success',
  Approved: 'badge--success',
  'Under Review': 'badge--pending',
  Denied: 'badge--danger',
};

const tierStatus: Record<string, string> = {
  Standard: 'badge--info',
  Preferred: 'badge--accent',
  Premium: 'badge--gold',
};

export function PolicyStatusBadge({ status }: { status: string }) {
  return <span className={`badge ${policyStatus[status] ?? ''}`}>{status}</span>;
}

export function ClaimStatusBadge({ status }: { status: string }) {
  return <span className={`badge ${claimStatus[status] ?? ''}`}>{status}</span>;
}

export function TierBadge({ tier }: { tier: string }) {
  return <span className={`badge ${tierStatus[tier] ?? ''}`}>{tier}</span>;
}

export function PolicyTypeBadge({ type }: { type: string }) {
  return <span className="badge badge--neutral">{type}</span>;
}
