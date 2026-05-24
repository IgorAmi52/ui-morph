export interface Policy {
  id: string;
  holder: string;
  email: string;
  type: 'Auto' | 'Home' | 'Life' | 'Health' | 'Business';
  premium: number;
  coverage: number;
  status: 'Active' | 'Pending' | 'Expired' | 'Cancelled';
  startDate: string;
  renewalDate: string;
}

export interface Claim {
  id: string;
  policyId: string;
  holder: string;
  email: string;
  type: string;
  amount: number;
  filedDate: string;
  status: 'Approved' | 'Under Review' | 'Denied' | 'Paid';
  adjuster: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  policies: number;
  tier: 'Standard' | 'Preferred' | 'Premium';
  since: string;
  totalPremium: number;
}

export interface Agent {
  id: string;
  name: string;
  email: string;
  region: string;
  policies: number;
  claims: number;
  status: 'Active' | 'On Leave';
}

export interface Report {
  id: string;
  name: string;
  period: string;
  format: string;
  size: string;
  generated: string;
}

export const dashboardStats = [
  { label: 'Active Policies', value: '12,847', change: '+4.2% vs last month', trend: 'up' as const },
  { label: 'Open Claims', value: '342', change: '-12% vs last month', trend: 'down' as const },
  { label: 'Monthly Premiums', value: '$2.4M', change: '+8.1% revenue', trend: 'up' as const },
  { label: 'Claims Ratio', value: '62.4%', change: '-2.3 pts improvement', trend: 'down' as const },
];

export const premiumTrend = [
  { month: 'Jan', premiums: 1.82, claims: 1.12 },
  { month: 'Feb', premiums: 1.95, claims: 1.08 },
  { month: 'Mar', premiums: 2.05, claims: 1.25 },
  { month: 'Apr', premiums: 2.12, claims: 1.18 },
  { month: 'May', premiums: 2.28, claims: 1.32 },
  { month: 'Jun', premiums: 2.41, claims: 1.28 },
];

export const claimsByCategory = [
  { category: 'Auto', count: 142 },
  { category: 'Home', count: 89 },
  { category: 'Health', count: 67 },
  { category: 'Life', count: 23 },
  { category: 'Business', count: 21 },
];

export const policyDistribution = [
  { name: 'Auto', value: 4520, color: '#0891b2' },
  { name: 'Home', value: 3180, color: '#06b6d4' },
  { name: 'Health', value: 2840, color: '#22d3ee' },
  { name: 'Life', value: 1520, color: '#67e8f9' },
  { name: 'Business', value: 787, color: '#a5f3fc' },
];

export const claimsTrend = [
  { month: 'Jan', filed: 48, resolved: 42 },
  { month: 'Feb', filed: 52, resolved: 49 },
  { month: 'Mar', filed: 61, resolved: 55 },
  { month: 'Apr', filed: 55, resolved: 58 },
  { month: 'May', filed: 58, resolved: 52 },
  { month: 'Jun', filed: 68, resolved: 61 },
];

export const regionPerformance = [
  { region: 'Northeast', policies: 3200, lossRatio: 58 },
  { region: 'Southeast', policies: 2800, lossRatio: 64 },
  { region: 'Midwest', policies: 2400, lossRatio: 61 },
  { region: 'Southwest', policies: 2100, lossRatio: 55 },
  { region: 'West', policies: 2347, lossRatio: 59 },
];

export const policies: Policy[] = [
  { id: 'POL-10001', holder: 'Jenifer Brown', email: 'jenifer.brown@gmail.com', type: 'Auto', premium: 184.50, coverage: 50000, status: 'Active', startDate: '15/03/2024', renewalDate: '15/03/2026' },
  { id: 'POL-10002', holder: 'Marcus Chen', email: 'marcus.chen@outlook.com', type: 'Home', premium: 312.00, coverage: 350000, status: 'Active', startDate: '02/01/2025', renewalDate: '02/01/2026' },
  { id: 'POL-10003', holder: 'Sarah Williams', email: 'sarah.w@yahoo.com', type: 'Life', premium: 89.00, coverage: 500000, status: 'Active', startDate: '10/06/2023', renewalDate: '10/06/2025' },
  { id: 'POL-10004', holder: 'David Miller', email: 'david.miller@icloud.com', type: 'Health', premium: 425.75, coverage: 100000, status: 'Pending', startDate: '01/05/2026', renewalDate: '01/05/2027' },
  { id: 'POL-10005', holder: 'Emma Thompson', email: 'emma.t@proton.me', type: 'Auto', premium: 156.20, coverage: 75000, status: 'Active', startDate: '22/11/2024', renewalDate: '22/11/2026' },
  { id: 'POL-10006', holder: 'James Rodriguez', email: 'j.rodriguez@gmail.com', type: 'Business', premium: 890.00, coverage: 2000000, status: 'Active', startDate: '08/09/2024', renewalDate: '08/09/2026' },
  { id: 'POL-10007', holder: 'Olivia Park', email: 'olivia.park@naver.com', type: 'Home', premium: 278.40, coverage: 420000, status: 'Expired', startDate: '14/02/2024', renewalDate: '14/02/2025' },
  { id: 'POL-10008', holder: 'Michael O\'Brien', email: 'm.obrien@hotmail.com', type: 'Health', premium: 512.00, coverage: 150000, status: 'Active', startDate: '30/04/2025', renewalDate: '30/04/2026' },
  { id: 'POL-10009', holder: 'Sophia Laurent', email: 's.laurent@orange.fr', type: 'Auto', premium: 198.90, coverage: 60000, status: 'Cancelled', startDate: '05/07/2024', renewalDate: '—' },
  { id: 'POL-10010', holder: 'Daniel Kim', email: 'daniel.kim@kakao.com', type: 'Life', premium: 125.00, coverage: 750000, status: 'Active', startDate: '18/12/2024', renewalDate: '18/12/2026' },
];

export const claims: Claim[] = [
  { id: 'CLM-50001', policyId: 'POL-10001', holder: 'Jenifer Brown', email: 'jenifer.brown@gmail.com', type: 'Collision', amount: 8750.00, filedDate: '02/01/2026, 18:15', status: 'Paid', adjuster: 'R. Martinez' },
  { id: 'CLM-50002', policyId: 'POL-10002', holder: 'Marcus Chen', email: 'marcus.chen@outlook.com', type: 'Water Damage', amount: 14200.00, filedDate: '28/12/2025, 14:32', status: 'Under Review', adjuster: 'A. Foster' },
  { id: 'CLM-50003', policyId: 'POL-10005', holder: 'Emma Thompson', email: 'emma.t@proton.me', type: 'Theft', amount: 3200.00, filedDate: '15/12/2025, 09:44', status: 'Approved', adjuster: 'R. Martinez' },
  { id: 'CLM-50004', policyId: 'POL-10006', holder: 'James Rodriguez', email: 'j.rodriguez@gmail.com', type: 'Property', amount: 45000.00, filedDate: '10/12/2025, 16:20', status: 'Under Review', adjuster: 'K. Walsh' },
  { id: 'CLM-50005', policyId: 'POL-10008', holder: 'Michael O\'Brien', email: 'm.obrien@hotmail.com', type: 'Medical', amount: 6800.50, filedDate: '05/12/2025, 11:55', status: 'Paid', adjuster: 'L. Chen' },
  { id: 'CLM-50006', policyId: 'POL-10001', holder: 'Jenifer Brown', email: 'jenifer.brown@gmail.com', type: 'Windshield', amount: 450.00, filedDate: '01/12/2025, 08:12', status: 'Paid', adjuster: 'R. Martinez' },
  { id: 'CLM-50007', policyId: 'POL-10003', holder: 'Sarah Williams', email: 'sarah.w@yahoo.com', type: 'Beneficiary', amount: 500000.00, filedDate: '25/11/2025, 20:33', status: 'Under Review', adjuster: 'K. Walsh' },
  { id: 'CLM-50008', policyId: 'POL-10010', holder: 'Daniel Kim', email: 'daniel.kim@kakao.com', type: 'Disability', amount: 12000.00, filedDate: '20/11/2025, 15:47', status: 'Denied', adjuster: 'L. Chen' },
  { id: 'CLM-50009', policyId: 'POL-10002', holder: 'Marcus Chen', email: 'marcus.chen@outlook.com', type: 'Fire', amount: 89000.00, filedDate: '12/11/2025, 03:28', status: 'Approved', adjuster: 'A. Foster' },
  { id: 'CLM-50010', policyId: 'POL-10005', holder: 'Emma Thompson', email: 'emma.t@proton.me', type: 'Vandalism', amount: 2100.00, filedDate: '08/11/2025, 19:05', status: 'Paid', adjuster: 'R. Martinez' },
];

export const customers: Customer[] = [
  { id: 'CUS-8001', name: 'Jenifer Brown', email: 'jenifer.brown@gmail.com', phone: '+1 555-0142', policies: 2, tier: 'Preferred', since: 'Mar 2022', totalPremium: 369.00 },
  { id: 'CUS-8002', name: 'Marcus Chen', email: 'marcus.chen@outlook.com', phone: '+1 555-0287', policies: 3, tier: 'Premium', since: 'Jan 2021', totalPremium: 1246.00 },
  { id: 'CUS-8003', name: 'Sarah Williams', email: 'sarah.w@yahoo.com', phone: '+1 555-0391', policies: 1, tier: 'Standard', since: 'Jun 2023', totalPremium: 89.00 },
  { id: 'CUS-8004', name: 'David Miller', email: 'david.miller@icloud.com', phone: '+1 555-0512', policies: 1, tier: 'Standard', since: 'May 2026', totalPremium: 425.75 },
  { id: 'CUS-8005', name: 'Emma Thompson', email: 'emma.t@proton.me', phone: '+44 7700-900142', policies: 2, tier: 'Preferred', since: 'Nov 2023', totalPremium: 312.20 },
  { id: 'CUS-8006', name: 'James Rodriguez', email: 'j.rodriguez@gmail.com', phone: '+1 555-0678', policies: 4, tier: 'Premium', since: 'Sep 2020', totalPremium: 2340.00 },
  { id: 'CUS-8007', name: 'Olivia Park', email: 'olivia.park@naver.com', phone: '+82 10-1234-5678', policies: 1, tier: 'Standard', since: 'Feb 2024', totalPremium: 278.40 },
  { id: 'CUS-8008', name: 'Daniel Kim', email: 'daniel.kim@kakao.com', phone: '+82 10-9876-5432', policies: 2, tier: 'Preferred', since: 'Dec 2024', totalPremium: 625.00 },
];

export const agents: Agent[] = [
  { id: 'AGT-001', name: 'Robert Martinez', email: 'r.martinez@insure.me', region: 'Northeast', policies: 428, claims: 89, status: 'Active' },
  { id: 'AGT-002', name: 'Amanda Foster', email: 'a.foster@insure.me', region: 'Southeast', policies: 356, claims: 72, status: 'Active' },
  { id: 'AGT-003', name: 'Kevin Walsh', email: 'k.walsh@insure.me', region: 'Midwest', policies: 312, claims: 65, status: 'Active' },
  { id: 'AGT-004', name: 'Lisa Chen', email: 'l.chen@insure.me', region: 'West', policies: 389, claims: 78, status: 'Active' },
  { id: 'AGT-005', name: 'Thomas Reed', email: 't.reed@insure.me', region: 'Southwest', policies: 298, claims: 54, status: 'On Leave' },
];

export const reports: Report[] = [
  { id: 'RPT-001', name: 'Monthly Loss Ratio Report', period: 'May 2026', format: 'PDF', size: '2.8 MB', generated: '24 May 2026' },
  { id: 'RPT-002', name: 'Policy Retention Analysis', period: 'Q2 2026', format: 'XLSX', size: '1.4 MB', generated: '23 May 2026' },
  { id: 'RPT-003', name: 'Claims Processing Summary', period: 'May 2026', format: 'PDF', size: '3.1 MB', generated: '22 May 2026' },
  { id: 'RPT-004', name: 'Regional Performance', period: 'Q2 2026', format: 'CSV', size: '620 KB', generated: '21 May 2026' },
  { id: 'RPT-005', name: 'Premium Revenue Forecast', period: 'H2 2026', format: 'PDF', size: '1.9 MB', generated: '20 May 2026' },
];

export const faqs = [
  { q: 'How do I file a new claim?', a: 'Navigate to Claims and click "File claim". Enter the policy number, incident date, and upload supporting documents. An adjuster will be assigned within 24 hours.' },
  { q: 'What factors affect premium rates?', a: 'Premiums are calculated based on coverage type, risk profile, location, claims history, and policy tier. Review Analytics for regional benchmarks.' },
  { q: 'How do I export policy data?', a: 'Use the Export button on any table page. Select CSV or XLSX format and choose your date range and filters before downloading.' },
];

export const CHART_COLORS = {
  primary: '#0891b2',
  secondary: '#06b6d4',
  tertiary: '#22d3ee',
  muted: '#cbd5e1',
  success: '#059669',
  warning: '#d97706',
  danger: '#dc2626',
};
