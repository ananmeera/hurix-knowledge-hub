import { FormEvent, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Send, Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../auth/AuthContext';
import type { ChatMessage, Source } from '../types';

const prompts = [
  'Does Hurix have a CMU Platform upload BOT?',
  'What does the Evolve Automation bot do?',
  'category: Manual - PDF accessibility',
  'What bots are available for Coursera?',
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
        <span className="pill">{source.type === 'automation' ? 'Bot' : 'Document'}</span>
        {source.status && <span className="pill">{source.status}</span>}
        {source.version && <span>v{source.version}</span>}
      </div>
      <h3>{source.title}</h3>
      {source.document_title && source.document_title !== source.title && <p className="source-doc">{source.document_title}</p>}
      {source.snippet && <p>{source.snippet}</p>}
      <small>
        {source.owner ? `Owner: ${source.owner}` : ''}
        {source.last_verified_date ? ` • Verified: ${source.last_verified_date}` : ''}
      </small>
      <div className="source-links">
        {source.href && <Link to={source.href}>{source.type === 'automation' ? 'Open BOT Automations' : 'Open in Knowledge'}</Link>}
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
  const [ratings, setRatings] = useState<Record<number, 'UP' | 'DOWN'>>({});
  const live = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const saved = Number(sessionStorage.getItem('kh-chat-session') || 0);
    if (!saved) return;
    api.session(saved).then((rows) => {
      if (!rows?.length) return;
      setSessionId(saved);
      setMessages(rows.map((row: any) => ({
        id: row.id,
        role: row.role,
        content: row.content,
        sources: row.sources || [],
        rating: row.rating,
      })));
      setRatings(Object.fromEntries(
        rows.filter((row: any) => row.id && (row.rating === 'UP' || row.rating === 'DOWN'))
          .map((row: any) => [row.id, row.rating]),
      ));
    }).catch(() => undefined);
  }, []);

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
      sessionStorage.setItem('kh-chat-session', String(r.session_id));
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

  const rate = async (id: number | undefined, rating: 'UP' | 'DOWN') => {
    if (!id) return;
    const previous = ratings[id];
    setRatings((current) => ({ ...current, [id]: rating }));
    try {
      await api.feedback({ message_id: id, rating });
    } catch {
      setRatings((current) => {
        const next = { ...current };
        if (previous) next[id] = previous;
        else delete next[id];
        return next;
      });
    }
  };

  const newChat = () => {
    sessionStorage.removeItem('kh-chat-session');
    setSessionId(undefined);
    setMessages([]);
    setRatings({});
    setInput('');
  };

  return (
    <div className="chat-page">
      <div className="chat-header">
        <div>
          <p className="eyebrow">AI Chat</p>
          <p className="muted">{messages.length ? 'This thread keeps context for follow-up questions.' : 'Start a question, then ask a follow-up in the same chat.'}</p>
        </div>
        <button type="button" className="secondary-btn new-chat-btn" onClick={newChat} disabled={!messages.length && !sessionId}>
          <Plus size={16} aria-hidden="true" /> New chat
        </button>
      </div>
      <div className="chat-scroll">
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
                  {m.role === 'assistant' && m.generated_by === 'retrieved' && <span className="gen-badge">Retrieved from knowledge</span>}
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
                    <button type="button" className={m.id && ratings[m.id] === 'UP' ? 'is-on' : ''} onClick={() => rate(m.id, 'UP')} aria-pressed={!!(m.id && ratings[m.id] === 'UP')} aria-label="Helpful"><ThumbsUp size={16} /></button>
                    <button type="button" className={m.id && ratings[m.id] === 'DOWN' ? 'is-on' : ''} onClick={() => rate(m.id, 'DOWN')} aria-pressed={!!(m.id && ratings[m.id] === 'DOWN')} aria-label="Not helpful"><ThumbsDown size={16} /></button>
                    {m.id && ratings[m.id] === 'UP' && <small>Marked helpful</small>}
                    {m.id && ratings[m.id] === 'DOWN' && <small>Marked not helpful</small>}
                  </div>
                )}
              </article>
            ))}
          </section>
        )}
      </div>
      <div ref={live} className="sr-only" aria-live="polite">
        {busy ? 'Knowledge Hub AI is searching approved knowledge.' : ''}
      </div>
      <form className="composer" onSubmit={submit}>
        <label className="sr-only" htmlFor="chat-input">Ask a question</label>
        <textarea id="chat-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question, then a follow-up in this chat" rows={2} />
        <button type="submit" className="send-btn" disabled={busy || !input.trim()} aria-label="Send message"><Send size={18} /></button>
      </form>
    </div>
  );
}
