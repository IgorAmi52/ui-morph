import PageHeader from '../components/shared/PageHeader';

const sections = [
  {
    title: 'Notifications',
    rows: [
      { label: 'New claim alerts', desc: 'Email when a claim is filed', on: true },
      { label: 'Policy renewal reminders', desc: 'Notify 30 days before renewal', on: true },
      { label: 'Daily digest', desc: 'Summary of platform activity', on: false },
    ],
  },
  {
    title: 'Claims processing',
    rows: [
      { label: 'Auto-assign adjusters', desc: 'Route claims by region automatically', on: true },
      { label: 'Fraud detection', desc: 'Flag suspicious claim patterns', on: true },
      { label: 'Approval threshold', select: '$10,000' },
    ],
  },
  {
    title: 'Display',
    rows: [
      { label: 'Compact tables', desc: 'Reduce row spacing in data tables', on: false },
      { label: 'Default date format', select: 'DD/MM/YYYY' },
    ],
  },
];

export default function Settings() {
  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Configure platform preferences and workflows."
      />
      <div className="settings-grid">
        {sections.map((section) => (
          <div key={section.title} className="settings-section">
            <h2 className="settings-section__title">{section.title}</h2>
            {section.rows.map((row) => (
              <div key={row.label} className="settings-row">
                <div>
                  <div className="settings-row__label">{row.label}</div>
                  <div className="settings-row__desc">{row.desc}</div>
                </div>
                {'select' in row ? (
                  <select className="settings-select" defaultValue={row.select}>
                    <option>{row.select}</option>
                    <option>$25,000</option>
                    <option>$50,000</option>
                  </select>
                ) : (
                  <div className={`settings-toggle${row.on ? '' : ' settings-toggle--off'}`} />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
