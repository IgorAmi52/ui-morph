import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  ChevronDown,
  Clock,
  Database,
  FileText,
  Filter,
  Gauge,
  Lock,
  Map,
  PieChart,
  RefreshCw,
  Search,
  Settings,
  Shield,
  TrendingUp,
} from 'lucide-react';
import type { ReactNode } from 'react';
import DataTable from '../components/shared/DataTable';
import {
  largeLossClaims,
  largeLossCoverageQuestions,
  largeLossTimeline,
  largeLossVendors,
  legacyBatchJobs,
  legacyComplianceChecks,
  legacyConsoleWidgets,
  legacyReserveLayers,
  legacyRuleDiagnostics,
} from '../data/mockData';
import '../components/insurance/Badges.css';
import '../styles/large-loss.css';

const activeClaim = largeLossClaims[0];

const consoleTabs = [
  'Overview',
  'Claim files',
  'Reserve authority',
  'Coverage',
  'Vendors',
  'Documents',
  'Payments',
  'Litigation',
  'Audit',
  'Rules',
  'Jobs',
  'Reports',
];

const serviceNav = [
  ['Claims intake', 'FNOL queue', 'Manual assignment', 'Duplicate detection'],
  ['Large loss', 'Authority console', 'Reserve workbench', 'Counsel referrals'],
  ['CAT events', 'Exposure map', 'Vendor grid', 'Event bulletin'],
  ['Administration', 'Rules manager', 'Batch jobs', 'Data exports'],
];

const fieldRows = [
  ['Claim file', activeClaim.id],
  ['Policy lineage', 'CMP-88-1048 > PROP-BI-2026'],
  ['Insured entity', activeClaim.insured],
  ['Loss location', activeClaim.location],
  ['Loss classification', activeClaim.lossType],
  ['Primary adjuster', activeClaim.owner],
  ['Branch authority', '$1,000,000'],
  ['Requested reserve', '$3,950,000'],
  ['Coverage status', activeClaim.status],
  ['Escalation reason', activeClaim.signal],
  ['Diary compliance', '2 overdue notes'],
  ['Last supervisor touch', 'Today 09:52'],
];

const noisyFilters = [
  'LOB=Commercial property',
  'Region=Central',
  'Severity>=High',
  'Reserve>$500K',
  'SLA<=24h',
  'CoverageHold=true',
  'VendorAssigned=false',
  'LitigationHold=any',
  'AuthorityQueue=open',
  'CATEvent=MW-0524',
];

const queueAging = [
  { label: '0-4h', value: 28, tone: 'success' },
  { label: '4-12h', value: 41, tone: 'info' },
  { label: '12-24h', value: 63, tone: 'warning' },
  { label: '24h+', value: 34, tone: 'danger' },
];

const regionExposure = [
  { label: 'Central', value: 84 },
  { label: 'Northeast', value: 62 },
  { label: 'Southeast', value: 48 },
  { label: 'West', value: 37 },
  { label: 'Southwest', value: 26 },
];

const authorityFunnel = [
  { label: 'Desk review', value: 47 },
  { label: 'Manager', value: 22 },
  { label: 'Branch VP', value: 11 },
  { label: 'Committee', value: 4 },
];

const reserveTrend = [24, 31, 29, 44, 52, 48, 61, 75, 69, 84, 91, 88];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function toneClass(tone: string) {
  return `legacy-metric legacy-module legacy-module--metric legacy-metric--${tone}`;
}

function statusBadge(value: string) {
  if (['Critical', 'Failed', 'Hold', 'Past due', 'Degraded'].includes(value)) return 'badge badge--danger';
  if (['High', 'Review', 'Queued', 'Running', 'At risk', 'Escalated'].includes(value)) return 'badge badge--warning';
  if (['Pass', 'Confirmed'].includes(value)) return 'badge badge--success';
  return 'badge badge--info';
}

export default function LargeLoss() {
  return (
    <div className="legacy-console" data-morph-id="legacy-claims-console">
      <div className="legacy-module-board" data-morph-id="legacy-reorderable-module-board">
        <header className="legacy-topbar legacy-module legacy-module--full" data-morph-id="legacy-console-topbar" data-morph-disable="resize">
          <div className="legacy-topbar__brand">
            <Shield size={18} />
            <strong>ClaimsOps Enterprise Console</strong>
            <span>prod-us-east-2 / carrier-17 / commercial-lines</span>
          </div>
          <div className="legacy-topbar__actions">
            <button type="button">
              <RefreshCw size={14} />
              Refresh
            </button>
            <button type="button">
              <Bell size={14} />
              19
            </button>
            <button type="button">
              <Settings size={14} />
              Console settings
            </button>
          </div>
        </header>

        <section className="legacy-alert-strip legacy-module legacy-module--full" data-morph-id="global-alert-strip">
          <span><AlertTriangle size={14} /> Reserve authority sync failed at 11:39</span>
          <span>7 SLA breaches</span>
          <span>4 litigation holds</span>
          <span>OCR extraction delayed by 128 documents</span>
          <span>CAT event MW-0524 severity recalculated</span>
        </section>

        <nav className="legacy-tabs legacy-module legacy-module--full" data-morph-id="legacy-tab-overflow" data-morph-disable="resize">
          {consoleTabs.map((tab, index) => (
            <button type="button" className={index === 0 ? 'legacy-tabs__tab legacy-tabs__tab--active' : 'legacy-tabs__tab'} key={tab}>
              {tab}
            </button>
          ))}
        </nav>

        <section className="legacy-toolbar legacy-module legacy-module--full" data-morph-id="filter-toolbar">
          <div className="legacy-search">
            <Search size={15} />
            <input value="event:MW-0524 severity:high reserve:>500000 coverage:hold" readOnly />
          </div>
          <div className="legacy-selects">
            {['Saved view: Complex claim supervisor', 'Region: Central', 'Queue: All breached', 'Data age: live'].map((label) => (
              <button type="button" key={label}>
                {label}
                <ChevronDown size={13} />
              </button>
            ))}
          </div>
        </section>

        <aside className="legacy-service-nav legacy-module legacy-module--side" data-morph-id="left-service-navigation" data-morph-resize="box">
          <div className="legacy-panel__heading">
            <Database size={14} />
            <span>Services</span>
          </div>
          {serviceNav.map(([group, ...items]) => (
            <div className="legacy-nav-group" key={group}>
              <strong>{group}</strong>
              {items.map((item) => (
                <button type="button" key={item}>{item}</button>
              ))}
            </div>
          ))}
        </aside>

        <section className="legacy-filter-cloud legacy-module legacy-module--xwide" data-morph-id="active-filter-cloud">
          <div className="legacy-panel__heading">
            <Filter size={14} />
            <span>Active constraints</span>
          </div>
          <div>
            {noisyFilters.map((filter) => (
              <span key={filter}>{filter}</span>
            ))}
          </div>
        </section>

        {legacyConsoleWidgets.map((widget) => (
          <article className={toneClass(widget.tone)} key={widget.code} data-morph-id={`metric-${widget.code.toLowerCase()}`} data-morph-resize="box">
            <span>{widget.code}</span>
            <strong>{widget.value}</strong>
            <p>{widget.label}</p>
            <em>{widget.meta}</em>
          </article>
        ))}

        <section className="legacy-panel legacy-module legacy-module--wide" data-morph-id="reserve-trend-dashboard" data-morph-resize="box">
          <PanelTitle icon={<TrendingUp size={14} />} title="Reserve movement dashboard" badge="$18.4M exposure" />
          <div className="legacy-chart legacy-chart--spark">
            <SparkBars values={reserveTrend} />
            <div className="legacy-chart__legend">
              <span>12h trend</span>
              <strong>+22% reserve pressure</strong>
            </div>
          </div>
        </section>

        <section className="legacy-panel legacy-module legacy-module--narrow" data-morph-id="sla-heatmap-dashboard" data-morph-resize="box">
          <PanelTitle icon={<Activity size={14} />} title="SLA breach heatmap" badge="live" />
          <div className="legacy-heatmap">
            {Array.from({ length: 24 }, (_, index) => (
              <span className={`legacy-heatmap__cell legacy-heatmap__cell--${index % 5}`} key={index} />
            ))}
          </div>
          <div className="legacy-panel-note">Darker cells indicate files aging past branch SLA.</div>
        </section>

        <section className="legacy-panel legacy-module legacy-module--narrow" data-morph-id="queue-aging-dashboard" data-morph-resize="box">
          <PanelTitle icon={<BarChart3 size={14} />} title="Queue aging histogram" badge="166 items" />
          <StackedBars data={queueAging} />
        </section>

        <section className="legacy-panel legacy-module legacy-module--narrow" data-morph-id="region-exposure-dashboard" data-morph-resize="box">
          <PanelTitle icon={<Map size={14} />} title="Exposure by region" badge="CAT MW-0524" />
          <RankBars data={regionExposure} />
        </section>

        <section className="legacy-panel legacy-module legacy-module--narrow" data-morph-id="authority-funnel-dashboard" data-morph-resize="box">
          <PanelTitle icon={<PieChart size={14} />} title="Authority funnel" badge="4 committee" />
          <Funnel data={authorityFunnel} />
        </section>

        <section className="legacy-panel legacy-module legacy-module--xwide" data-morph-id="claim-workload-table">
          <div className="legacy-panel__title">
            <div>
              <h2>Large loss workload matrix</h2>
              <p>Dense operational view intentionally includes every branch requirement and queue signal.</p>
            </div>
            <span className="badge badge--danger">Manual review required</span>
          </div>
          <DataTable
            bare
            data={largeLossClaims}
            getRowKey={(claim) => claim.id}
            selectedKey={activeClaim.id}
            columns={[
              { key: 'id', header: 'File', sortable: true, render: (claim) => claim.id, className: 'td-mono' },
              { key: 'insured', header: 'Insured / account', render: (claim) => claim.insured },
              { key: 'location', header: 'Loss location', render: (claim) => claim.location, className: 'td-muted' },
              { key: 'loss', header: 'Loss type', render: (claim) => claim.lossType },
              { key: 'severity', header: 'Severity', render: (claim) => <span className={statusBadge(claim.severity)}>{claim.severity}</span> },
              { key: 'reserve', header: 'Reserve', sortable: true, render: (claim) => formatCurrency(claim.reserve) },
              { key: 'exposure', header: 'Gross exposure', sortable: true, render: (claim) => formatCurrency(claim.exposure) },
              { key: 'sla', header: 'SLA clock', render: (claim) => <span className={statusBadge(claim.sla)}>{claim.sla}</span> },
              { key: 'status', header: 'Workflow state', render: (claim) => claim.status },
              { key: 'owner', header: 'Owner', render: (claim) => claim.owner, className: 'td-muted' },
              { key: 'signal', header: 'System signal', render: (claim) => claim.signal },
            ]}
          />
        </section>

        <section className="legacy-panel legacy-module legacy-module--narrow" data-morph-id="selected-file-record" data-morph-resize="box">
          <div className="legacy-panel__title">
            <h2>Selected file record</h2>
            <Lock size={14} />
          </div>
          <div className="legacy-field-table">
            {fieldRows.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="legacy-panel legacy-module legacy-module--wide" data-morph-id="reserve-layer-stack">
          <div className="legacy-panel__title">
            <h2>Reserve layer stack</h2>
            <DollarIcon />
          </div>
          <div className="legacy-mini-table">
            <div className="legacy-mini-table__head">
              <span>Layer</span>
              <span>Current</span>
              <span>Requested</span>
              <span>Authority</span>
            </div>
            {legacyReserveLayers.map((layer) => (
              <div className="legacy-mini-table__row" key={layer.layer}>
                <span>{layer.layer}</span>
                <span>{formatCurrency(layer.current)}</span>
                <span>{formatCurrency(layer.requested)}</span>
                <span>{layer.authority} {layer.variance}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="legacy-panel legacy-module legacy-module--narrow" data-morph-id="rule-diagnostics">
          <div className="legacy-panel__title">
            <h2>Rule diagnostics</h2>
            <FileText size={14} />
          </div>
          <div className="legacy-rule-list">
            {legacyRuleDiagnostics.map((rule) => (
              <div className="legacy-rule" key={rule.id}>
                <span className="td-mono">{rule.id}</span>
                <strong>{rule.rule}</strong>
                <em>{rule.queue} / {rule.owner} / {rule.lastRun}</em>
                <span className={statusBadge(rule.result)}>{rule.result}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="legacy-panel legacy-module legacy-module--narrow" data-morph-id="coverage-question-stack">
          <div className="legacy-panel__title">
            <h2>Coverage issue stack</h2>
            <span className="badge badge--warning">11 open</span>
          </div>
          <ul className="legacy-dense-list">
            {largeLossCoverageQuestions.concat([
              'Confirm deductible stacking across warehouse and stock schedules',
              'Review coinsurance penalty before committee authority vote',
              'Check whether appraisal clause blocks expedited settlement',
            ]).map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </section>

        <section className="legacy-panel legacy-module legacy-module--narrow" data-morph-id="batch-job-monitor">
          <div className="legacy-panel__title">
            <h2>Batch job monitor</h2>
            <Clock size={14} />
          </div>
          <div className="legacy-job-list">
            {legacyBatchJobs.map((job) => (
              <div className="legacy-job" key={job.id}>
                <span className="td-mono">{job.id}</span>
                <strong>{job.name}</strong>
                <span className={statusBadge(job.status)}>{job.status}</span>
                <em>{job.runtime} / {job.records} rec</em>
              </div>
            ))}
          </div>
        </section>

        <section className="legacy-panel legacy-module legacy-module--wide" data-morph-id="vendor-sla-panel">
          <div className="legacy-panel__title">
            <h2>Vendor SLA console</h2>
            <span className="badge badge--warning">capacity risk</span>
          </div>
          <div className="legacy-vendor-table">
            {largeLossVendors.map((vendor) => (
              <div key={vendor.name}>
                <strong>{vendor.name}</strong>
                <span>{vendor.role}</span>
                <em>{vendor.eta}</em>
                <span className={statusBadge(vendor.status)}>{vendor.status}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="legacy-panel legacy-module legacy-module--narrow" data-morph-id="compliance-checklist">
          <div className="legacy-panel__title">
            <h2>Compliance checklist</h2>
            <span className="badge badge--info">6 controls</span>
          </div>
          <ul className="legacy-check-list">
            {legacyComplianceChecks.map((check, index) => (
              <li key={check}>
                <input type="checkbox" checked={index < 2} readOnly />
                <span>{check}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="legacy-panel legacy-module legacy-module--narrow" data-morph-id="audit-timeline">
          <div className="legacy-panel__title">
            <h2>Audit and diary stream</h2>
            <span className="badge badge--neutral">live</span>
          </div>
          <div className="legacy-timeline">
            {largeLossTimeline.concat([
              { time: '11:48', title: 'Authority rule failed', detail: 'Reserve increase requires committee approval.' },
              { time: '11:52', title: 'Vendor note synced', detail: 'BlueRiver capacity delay posted to file.' },
            ]).map((event) => (
              <div key={`${event.time}-${event.title}`}>
                <time>{event.time}</time>
                <strong>{event.title}</strong>
                <p>{event.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="legacy-panel legacy-module legacy-module--wide" data-morph-id="raw-system-payload">
          <div className="legacy-panel__title">
            <h2>Raw policy/claim payload preview</h2>
            <span className="badge badge--neutral">legacy JSON</span>
          </div>
          <pre>{`{
  "claimFile": "${activeClaim.id}",
  "event": "MW-0524",
  "authorityChain": ["adjuster", "branch_manager", "large_loss_committee"],
  "coverageFlags": ["BI_WAITING_PERIOD", "SPOILAGE_EXCLUSION", "COUNSEL_RETAINED"],
  "queues": { "coverage": 11, "reserve": 4, "vendorSla": 8, "documents": 128 },
  "lastSync": "2026-05-24T11:52:00+02:00"
}`}</pre>
        </section>

        <section className="legacy-panel legacy-module legacy-module--narrow" data-morph-id="system-health-dashboard" data-morph-resize="box">
          <PanelTitle icon={<Gauge size={14} />} title="Subsystem health" badge="mixed" />
          <div className="legacy-health-grid">
            {['Rules', 'OCR', 'Billing', 'Vendor API', 'Postgres', 'Archive'].map((item, index) => (
              <div key={item}>
                <span>{item}</span>
                <strong>{['97%', '63%', '88%', '71%', '99%', '82%'][index]}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function PanelTitle({ title, badge, icon }: { title: string; badge: string; icon: ReactNode }) {
  return (
    <div className="legacy-panel__title">
      <div>
        <h2>{title}</h2>
      </div>
      <span className="legacy-panel__title-side">
        {icon}
        <span className="badge badge--neutral">{badge}</span>
      </span>
    </div>
  );
}

function SparkBars({ values }: { values: number[] }) {
  const max = Math.max(...values);
  return (
    <div className="legacy-spark-bars">
      {values.map((value, index) => (
        <span key={`${value}-${index}`} style={{ height: `${Math.max(12, (value / max) * 100)}%` }} />
      ))}
    </div>
  );
}

function StackedBars({ data }: { data: Array<{ label: string; value: number; tone: string }> }) {
  return (
    <div className="legacy-stack-bars">
      {data.map((item) => (
        <div key={item.label}>
          <span>{item.label}</span>
          <div>
            <i className={`legacy-bar legacy-bar--${item.tone}`} style={{ width: `${item.value}%` }} />
          </div>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

function RankBars({ data }: { data: Array<{ label: string; value: number }> }) {
  return (
    <div className="legacy-rank-bars">
      {data.map((item) => (
        <div key={item.label}>
          <span>{item.label}</span>
          <div>
            <i style={{ width: `${item.value}%` }} />
          </div>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

function Funnel({ data }: { data: Array<{ label: string; value: number }> }) {
  const max = Math.max(...data.map((item) => item.value));
  return (
    <div className="legacy-funnel">
      {data.map((item) => (
        <div key={item.label} style={{ width: `${45 + (item.value / max) * 55}%` }}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

function DollarIcon() {
  return <span className="legacy-dollar-icon">$</span>;
}
