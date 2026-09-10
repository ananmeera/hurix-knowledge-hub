import { FormEvent, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Send, Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../auth/AuthContext';
import type { ChatMessage, Source } from '../types';

const prompts = [
  'What automations are available for Excel?',
  'How do I request a new automation?',
  'Find the latest approved IT access process.',
  'What onboarding knowledge is available?',
];

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('_') && part.endsWith('_')) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return <span key={i}>{part}</span>;
  });
}

function ListBlock({ lines, numbered }: { lines: string[]; numbered: boolean }) {
  const ListTag = numbered ? 'ol' : 'ul';
  return (
    <ListTag start={numbered ? Number(lines[0].match(/^\d+/)?.[0] || 1) : undefined}>
      {lines.map((line, j) => (
        <li key={j}>{renderInline(line.replace(/^([-•]|\d+\.)\s*/, ''))}</li>
      ))}
    </ListTag>
  );
}

function AnswerBody({ content }: { content: string }) {
  const blocks = content.trim().split(/\n{2,}/);
  return (
    <div className="answer-body">
      {blocks.map((block, i) => {
        const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
        const parts: ReactNode[] = [];
        let buffer: string[] = [];
        let bufferKind: 'bullet' | 'number' | null = null;
        const flush = () => {
          if (!buffer.length) return;
          parts.push(<ListBlock key={`l-${parts.length}`} lines={buffer} numbered={bufferKind === 'number'} />);
          buffer = [];
          bufferKind = null;
        };
        lines.forEach((line, j) => {
          const kind = /^\d+\.\s/.test(line) ? 'number' : /^[-•]/.test(line) ? 'bullet' : null;
          if (kind) {
            if (bufferKind && bufferKind !== kind) flush();
            bufferKind = kind;
            buffer.push(line);
            return;
          }
          flush();
          if (/^\*\*[^*]+\*\*$/.test(line)) {
            parts.push(<h3 key={`h-${j}`}>{line.slice(2, -2)}</h3>);
          } else {
            parts.push(<p key={`p-${j}`}>{renderInline(line)}</p>);
          }
        });
        flush();
        return <div key={i} className="answer-block">{parts}</div>;
      })}
    </div>
  );
}

function SourceCard({ source }: { source: Source }) {
  return (
    <article className="source-card">
      <div className="source-meta">
        <span className="pill">{source.type === 'automation' ? 'Automation' : 'Document'}</span>
        {source.version && <span>v{source.version}</span>}
      </div>
      <h3>{source.title}</h3>
      {source.snippet && <p>{source.snippet}</p>}
      <small>
        {source.owner ? `Owner: ${source.owner}` : ''}
        {source.last_verified_date ? ` • Verified: ${source.last_verified_date}` : ''}
      </small>
      <div className="source-links">
        {source.href && <Link to={source.href}>{source.type === 'automation' ? 'Open catalog' : 'Open in Knowledge'}</Link>}
        {source.download_url && (
          <a href={source.download_url} target="_blank" rel="noreferrer">
            Download {source.filename || 'original file'}
          </a>
        )}
      </div>
    </article>
  );
}

export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState<number | undefined>();
  const live = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLElement>(null);

  useEffect(() => {
    resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [messages, busy]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setMessages((m) => [...m, { role: 'user', content: q }]);
    setInput('');
    setBusy(true);
    try {
      const r = await api.chat(q, sessionId);
      setSessionId(r.session_id);
      setMessages((m) => [...m, {
        id: r.message_id,
        role: 'assistant',
        content: r.answer,
        sources: r.sources,
        knowledge_gap: r.knowledge_gap,
        generated_by: r.generated_by,
      }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: 'assistant', content: `Unable to answer: ${e.message}` }]);
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const rate = async (id: number | undefined, rating: string) => {
    await api.feedback({ message_id: id, rating });
  };

  return (
    <div className="chat-page">
      {messages.length === 0 ? (
        <section className="welcome">
          <p className="eyebrow"><Sparkles size={16} />TRUSTED ORGANIZATIONAL KNOWLEDGE</p>
          <h1>Good day, {user?.name?.split(' ')[0]}.</h1>
          <p>What organizational knowledge can I help you find?</p>
          <div className="prompt-grid">
            {prompts.map((p) => <button key={p} onClick={() => send(p)}>{p}</button>)}
          </div>
        </section>
      ) : (
        <section className="conversation" aria-label="Conversation">
          {messages.map((m, i) => (
            <article key={i} className={`message ${m.role}`} ref={i === messages.length - 1 ? resultRef : undefined}>
              <div className="message-label">
                {m.role === 'user' ? 'You' : 'Knowledge Hub AI'}
                {m.role === 'assistant' && m.generated_by === 'gemini' && <span className="gen-badge gemini">Summarized by Gemini</span>}
                {m.role === 'assistant' && m.generated_by === 'openai' && <span className="gen-badge">Summarized by AI</span>}
                {m.role === 'assistant' && m.generated_by === 'retrieved' && <span className="gen-badge warn">Source text only — add GEMINI_API_KEY</span>}
                {m.role === 'assistant' && m.generated_by === 'error' && <span className="gen-badge warn">Gemini failed — showing source text</span>}
              </div>
              <div className="message-body">
                {m.role === 'assistant' ? <AnswerBody content={m.content} /> : m.content}
              </div>
              {m.knowledge_gap && (
                <p className="gap-note" role="status">Not enough approved knowledge was found for a confident answer.</p>
              )}
              {m.sources && m.sources.length > 0 && (
                <div className="sources">
                  <h3>Sources</h3>
                  <div className="source-list">
                    {m.sources.map((s, j) => <SourceCard key={`${s.type}-${s.id}-${j}`} source={s} />)}
                  </div>
                </div>
              )}
              {m.role === 'assistant' && (
                <div className="feedback-actions">
                  <span>Was this useful?</span>
                  <button onClick={() => rate(m.id, 'UP')} aria-label="Helpful"><ThumbsUp size={16} /></button>
                  <button onClick={() => rate(m.id, 'DOWN')} aria-label="Not helpful"><ThumbsDown size={16} /></button>
                </div>
              )}
            </article>
          ))}
        </section>
      )}
      <div ref={live} className="sr-only" aria-live="polite">
        {busy ? 'Knowledge Hub AI is searching approved knowledge.' : ''}
      </div>
      <form className="composer" onSubmit={submit}>
        <label className="sr-only" htmlFor="chat-input">Ask a question</label>
        <textarea id="chat-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about SOPs, templates, automations, project learnings…" rows={2} />
        <button className="send-btn" disabled={busy || !input.trim()} aria-label="Send message"><Send size={20} /></button>
      </form>
    </div>
  );
}
