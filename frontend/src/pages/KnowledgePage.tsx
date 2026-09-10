import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../auth/AuthContext';
import type { DocumentDetail, DocumentItem } from '../types';

export default function KnowledgePage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [selected, setSelected] = useState<DocumentDetail | null>(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const admin = !!user && ['SUPER_ADMIN', 'ADMIN', 'KNOWLEDGE_MANAGER'].includes(user.role);

  const load = () => api.documents().then(setDocs);

  const openDoc = async (id: number) => {
    setError('');
    try {
      setSelected(await api.document(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load document details');
    }
  };

  useEffect(() => {
    load();
    const docId = Number(params.get('doc') || '');
    if (docId) openDoc(docId);
  }, [params]);

  const upload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setMsg('');
    const form = e.currentTarget;
    const fd = new FormData(form);
    try {
      const saved = await api.upload(fd) as DocumentDetail;
      setMsg('Document uploaded. Extracted text is shown below. Approve it before employee AI retrieval.');
      form.reset();
      await load();
      setSelected(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const refreshDoc = async (id: number) => {
    await load();
    if (selected?.id === id) openDoc(id);
  };

  const setStatus = async (id: number, action: 'approve' | 'outdated') => {
    setError('');
    try {
      if (action === 'approve') await api.approve(id);
      else await api.markOutdated(id);
      await refreshDoc(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update document status');
    }
  };

  return (
    <section className="page">
      <div className="page-heading">
        <p className="eyebrow">APPROVED SOURCES</p>
        <h1>Knowledge Library</h1>
        <p>Review organizational SOPs, guides and reference material. Demo login can upload and reopen extracted content.</p>
      </div>
      {admin && (
        <form className="upload-panel" onSubmit={upload}>
          <h2>Upload knowledge</h2>
          <div className="form-grid">
            <label>Title<input name="title" required /></label>
            <label>Category<input name="category" defaultValue="General" /></label>
            <label>Owner<input name="owner" /></label>
            <label>Version<input name="version" defaultValue="1.0" /></label>
            <label>Visibility
              <select name="confidentiality_level" defaultValue="PUBLIC_INTERNAL">
                <option>PUBLIC_INTERNAL</option>
                <option>DEPARTMENT_ONLY</option>
                <option>RESTRICTED</option>
              </select>
            </label>
            <label>File<input name="file" type="file" accept=".pdf,.docx,.txt,.md" required /></label>
          </div>
          <button className="primary-btn">Upload document</button>
          {msg && <p role="status">{msg}</p>}
          {error && <p role="alert" className="form-error">{error}</p>}
        </form>
      )}
      {selected && (
        <article className="doc-detail" aria-live="polite">
          <div className="status-row">
            <h2>{selected.title}</h2>
            <button className="text-btn" onClick={() => setSelected(null)}>Close</button>
          </div>
          <dl>
            <div><dt>Status</dt><dd>{selected.status}</dd></div>
            <div><dt>Category</dt><dd>{selected.category || '—'}</dd></div>
            <div><dt>Owner</dt><dd>{selected.owner || '—'}</dd></div>
            <div><dt>Version</dt><dd>{selected.version}</dd></div>
            <div><dt>File</dt><dd>{selected.source_location ? (
              <a href={`${import.meta.env.VITE_API_BASE || '/api'}/knowledge/documents/${selected.id}/file`} target="_blank" rel="noreferrer">
                {selected.source_location.split('_').slice(1).join('_') || selected.source_location}
              </a>
            ) : '—'}</dd></div>
            <div><dt>Type</dt><dd>{selected.document_type || '—'}</dd></div>
          </dl>
          {admin && (
            <div className="doc-actions">
              {selected.status !== 'APPROVED' && <button className="text-btn" onClick={() => setStatus(selected.id, 'approve')}>Approve</button>}
              {selected.status !== 'OUTDATED' && <button className="text-btn" onClick={() => setStatus(selected.id, 'outdated')}>Mark outdated</button>}
            </div>
          )}
          <h3>Extracted text</h3>
          <pre className="extracted-text">{selected.extracted_text?.trim() || 'No text could be extracted from this file.'}</pre>
        </article>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Version</th>
              <th>Owner</th>
              <th>Visibility</th>
              {admin && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id} className={selected?.id === d.id ? 'is-selected' : undefined}>
                <td>
                  <button className="text-btn" onClick={() => openDoc(d.id)}>
                    <strong>{d.title}</strong>
                  </button>
                  <small>{d.category}</small>
                </td>
                <td><span className="pill">{d.status}</span></td>
                <td>{d.version}</td>
                <td>{d.owner || '—'}</td>
                <td>{d.confidentiality_level}</td>
                {admin && (
                  <td className="doc-actions">
                    {d.status !== 'APPROVED' && <button className="text-btn" onClick={() => setStatus(d.id, 'approve')}>Approve</button>}
                    {d.status !== 'OUTDATED' && <button className="text-btn" onClick={() => setStatus(d.id, 'outdated')}>Mark outdated</button>}
                    {d.status === 'OUTDATED' && <span className="muted">Outdated</span>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
