import PageHeader from '../components/shared/PageHeader';
import { faqs } from '../data/mockData';

export default function Support() {
  return (
    <>
      <PageHeader
        title="Support"
        subtitle="Find answers to common questions about insure.me."
      />
      <div className="faq-list">
        {faqs.map((faq) => (
          <div key={faq.q} className="faq-item">
            <div className="faq-item__q">{faq.q}</div>
            <div className="faq-item__a">{faq.a}</div>
          </div>
        ))}
      </div>
    </>
  );
}
