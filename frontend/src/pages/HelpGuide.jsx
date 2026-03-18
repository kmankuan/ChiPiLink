import { useState, useEffect } from 'react';
import RESOLVED_API_URL from '@/config/apiUrl';

const API = RESOLVED_API_URL;

function RenderSection({ section }) {
  return (
    <section id={section.id}>
      <h2>{section.title}</h2>

      {section.image_url && (
        <div style={{ margin: '16px 0', textAlign: 'center' }}>
          <img src={section.image_url} alt={section.title} style={{ maxWidth: 320, borderRadius: 12, border: '1px solid #ddd' }} />
        </div>
      )}

      {section.content && <p>{section.content}</p>}

      {section.type === 'steps' && section.steps?.length > 0 && (
        <ol>
          {section.steps.map((step, i) => <li key={i}>{step}</li>)}
        </ol>
      )}

      {section.type === 'steps' && section.tips?.length > 0 && (
        <>
          <h3>Tips & Troubleshooting</h3>
          <ul>
            {section.tips.map((tip, i) => (
              <li key={i}><strong>{tip.title}</strong> {tip.content}</li>
            ))}
          </ul>
        </>
      )}

      {(section.type === 'list' || section.type === 'faq') && section.items?.length > 0 && (
        section.type === 'faq' ? (
          section.items.map((item, i) => (
            <div key={i}>
              <h3>{item.title}</h3>
              <p>{item.content}</p>
            </div>
          ))
        ) : (
          <ul>
            {section.items.map((item, i) => (
              <li key={i}><strong>{item.title}:</strong> {item.content}</li>
            ))}
          </ul>
        )
      )}

      <hr style={{ margin: '32px 0', border: 'none', borderTop: '1px solid #ddd' }} />
    </section>
  );
}

export default function HelpGuide() {
  const [guide, setGuide] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/help-guide/content`)
      .then(r => r.json())
      .then(data => setGuide(data.guide))
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px', fontFamily: 'system-ui, sans-serif', color: '#222' }}>
        <h1>Help Guide</h1>
        <p>Unable to load the help guide content. Please try again later.</p>
      </div>
    );
  }

  if (!guide) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px', textAlign: 'center', color: '#888' }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px', fontFamily: 'system-ui, sans-serif', color: '#222', lineHeight: 1.7 }}>
      <h1>{guide.title}</h1>
      {guide.intro && <p>{guide.intro}</p>}
      <hr style={{ margin: '32px 0', border: 'none', borderTop: '1px solid #ddd' }} />
      {(guide.sections || [])
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map(section => <RenderSection key={section.id} section={section} />)}
    </div>
  );
}
