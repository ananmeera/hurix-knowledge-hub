import { useEffect, useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, CircleAlert, HelpCircle, MessagesSquare, Smile, Users, Workflow } from 'lucide-react';
import { api } from '../services/api';

type Dashboard = {
  total_documents: number;
  approved_documents: number;
  outdated_documents: number;
  draft_documents?: number;
  knowledge_gaps: number;
  available_automations: number;
  total_questions: number;
  positive_feedback_rate: number;
  active_users: number;
  documents_by_status?: Record<string, number>;
  questions_last_7_days?: { date: string; count: number }[];
};

const STATUS_COLORS: Record<string, string> = {
  APPROVED: '#12B5A8',
  DRAFT: '#FF5A1F',
  OUTDATED: '#F5A524',
  UNKNOWN: '#1F6FEB',
};

function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <svg viewBox="0 0 160 160" className="donut-chart" role="img" aria-label="Documents by status">
      <circle cx="80" cy="80" r={radius} fill="none" stroke="#EEF3F8" strokeWidth="18" />
      {data.map((item) => {
        const length = (item.value / total) * circumference;
        const circle = (
          <circle
            key={item.label}
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={item.color}
            strokeWidth="18"
            strokeDasharray={`${length} ${circumference - length}`}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
            transform="rotate(-90 80 80)"
          />
        );
        offset += length;
        return circle;
      })}
      <text x="80" y="76" textAnchor="middle" className="donut-value">{total === 1 && data.every((d) => d.value === 0) ? 0 : data.reduce((s, i) => s + i.value, 0)}</text>
      <text x="80" y="96" textAnchor="middle" className="donut-caption">Docs</text>
    </svg>
  );
}

function BarChart({ points }: { points: { label: string; value: number }[] }) {
  const max = Math.max(...points.map((p) => p.value), 1);
  return (
    <div className="bar-chart" role="img" aria-label="Questions asked in the last 7 days">
      {points.map((point) => (
        <div className="bar-col" key={point.label}>
          <div className="bar-track">
            <div className="bar-fill" style={{ height: `${(point.value / max) * 100}%` }} />
          </div>
          <strong>{point.value}</strong>
          <span>{point.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminPage() {
  const [d, setD] = useState<Dashboard | null>(null);
  useEffect(() => { api.dashboard().then(setD); }, []);
  const statusSlices = useMemo(() => {
    if (!d) return [];
    const source = d.documents_by_status && Object.keys(d.documents_by_status).length
      ? d.documents_by_status
      : { APPROVED: d.approved_documents, DRAFT: d.draft_documents || 0, OUTDATED: d.outdated_documents };
    return Object.entries(source).map(([label, value]) => ({
      label,
      value,
      color: STATUS_COLORS[label] || STATUS_COLORS.UNKNOWN,
    }));
  }, [d]);
  const weekPoints = useMemo(() => {
    if (!d?.questions_last_7_days?.length) return [];
    return d.questions_last_7_days.map((row) => ({
      label: new Date(`${row.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' }),
      value: row.count,
    }));
  }, [d]);

  if (!d) return <p role="status">Loading dashboard…</p>;

  const cards = [
    { label: 'Total Knowledge Documents', value: d.total_documents, icon: BookOpen, tone: 'orange' },
    { label: 'Approved Documents', value: d.approved_documents, icon: CheckCircle2, tone: 'teal' },
    { label: 'Outdated Documents', value: d.outdated_documents, icon: CircleAlert, tone: 'gold' },
    { label: 'Knowledge Gaps', value: d.knowledge_gaps, icon: HelpCircle, tone: 'navy' },
    { label: 'Available Bots', value: d.available_automations, icon: Workflow, tone: 'blue' },
    { label: 'Questions Asked', value: d.total_questions, icon: MessagesSquare, tone: 'orange' },
    { label: 'Positive Feedback', value: `${d.positive_feedback_rate}%`, icon: Smile, tone: 'teal' },
    { label: 'Active Users', value: d.active_users, icon: Users, tone: 'navy' },
  ];

  return (
    <section className="page dashboard-page">
      <div className="page-heading">
        <p className="eyebrow">KNOWLEDGE HEALTH</p>
        <h1>Admin Dashboard</h1>
        <p>Monitor usage, knowledge quality and automation discovery.</p>
      </div>
      <div className="metric-grid">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article className={`metric metric-${card.tone}`} key={card.label}>
              <span className="metric-icon" aria-hidden="true"><Icon size={20} /></span>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </article>
          );
        })}
      </div>
      <div className="chart-grid">
        <article className="chart-card">
          <div className="chart-heading">
            <h2>Document status</h2>
            <p>How the knowledge library is currently classified.</p>
          </div>
          <div className="donut-wrap">
            <DonutChart data={statusSlices} />
            <ul className="chart-legend">
              {statusSlices.map((slice) => (
                <li key={slice.label}>
                  <i style={{ background: slice.color }} />
                  <span>{slice.label.replace(/_/g, ' ')}</span>
                  <strong>{slice.value}</strong>
                </li>
              ))}
            </ul>
          </div>
        </article>
        <article className="chart-card">
          <div className="chart-heading">
            <h2>Questions this week</h2>
            <p>Daily employee questions asked in AI chat.</p>
          </div>
          {weekPoints.length ? <BarChart points={weekPoints} /> : <p className="muted">No chat activity yet.</p>}
        </article>
      </div>
    </section>
  );
}
