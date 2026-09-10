import { FormEvent, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../auth/AuthContext';
import type { Automation } from '../types';

export default function AutomationPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Automation[]>([]);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const admin = !!user && ['SUPER_ADMIN', 'ADMIN', 'KNOWLEDGE_MANAGER'].includes(user.role);

  const load = async (term = '') => setItems(await api.automations(term));

  useEffect(() => { load(); }, []);

  const addOne = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setMsg('');
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      await api.createAutomation({
        name: String(data.name || ''),
        short_description: String(data.short_description || ''),
        detailed_description: String(data.detailed_description || ''),
        business_function: String(data.business_function || ''),
        capabilities: String(data.capabilities || ''),
        owner: String(data.owner || ''),
        technology: String(data.technology || ''),
        status: String(data.status || 'ACTIVE'),
      });
      form.reset();
      setMsg('Automation added. Chat can retrieve it immediately.');
      await load(q);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add automation');
    }
  };

  const importFile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setMsg('');
    const form = e.currentTarget;
    const file = new FormData(form).get('file');
    if (!(file instanceof File) || !file.size) {
      setError('Choose a CSV or JSON file first');
      return;
    }
    try {
      const result = await api.importAutomations(file);
      form.reset();
      setMsg(`Imported ${result.created} automation(s). ${result.skipped} already existed and were skipped.`);
      await load(q);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    }
  };

  return (
    <section className="page">
      <div className="page-heading">
        <p className="eyebrow">AVAILABLE RPA BOTS</p>
        <h1>BOT Automations</h1>
        <p>Browse the real RPA bots already built in the organization. Chat searches these bots along with approved knowledge documents.</p>
      </div>

      {admin && (
        <>
          <form className="upload-panel" onSubmit={importFile}>
            <h2>Import bot list</h2>
            <p className="muted">Upload a CSV or JSON list of bots. Required columns: <code>name</code>, <code>short_description</code>. Optional: detailed_description, business_function, capabilities, owner, technology, status. Existing bot names are skipped.</p>
            <div className="form-grid">
              <label>CSV or JSON file<input name="file" type="file" accept=".csv,.json,text/csv,application/json" required /></label>
            </div>
            <button className="primary-btn" type="submit">Import bots</button>
          </form>

          <form className="upload-panel" onSubmit={addOne}>
            <h2>Add one bot</h2>
            <div className="form-grid">
              <label>Name<input name="name" required placeholder="MSVGo Automation" /></label>
              <label>Business function<input name="business_function" placeholder="Media" /></label>
              <label>Technology<input name="technology" placeholder="UiPath / Python" /></label>
              <label>Owner<input name="owner" placeholder="RPA Team" /></label>
              <label>Status
                <select name="status" defaultValue="ACTIVE">
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PILOT">PILOT</option>
                  <option value="UNDER_DEVELOPMENT">UNDER_DEVELOPMENT</option>
                  <option value="RETIRED">RETIRED</option>
                </select>
              </label>
              <label>Capabilities<input name="capabilities" placeholder="Excel validation; exception report" /></label>
            </div>
            <label className="stack-label">Short description<textarea name="short_description" required rows={2} /></label>
            <label className="stack-label">Detailed description<textarea name="detailed_description" rows={3} /></label>
            <button className="primary-btn" type="submit">Add bot</button>
          </form>
        </>
      )}

      {msg && <p className="gap-note" role="status">{msg}</p>}
      {error && <p className="form-error">{error}</p>}

      <form className="searchbar" onSubmit={(e) => { e.preventDefault(); load(q); }}>
        <Search size={18} />
        <label className="sr-only" htmlFor="auto-search">Search bots</label>
        <input id="auto-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search MSVGo, Evolve, Coursera, UiPath…" />
        <button type="submit">Search</button>
      </form>

      <div className="card-grid">
        {items.map((x) => (
          <article className="catalog-card" key={x.id}>
            <div className="status-row">
              <span className="pill">{x.status}</span>
              <span>{x.technology}</span>
            </div>
            <h2>{x.name}</h2>
            <p>{x.short_description}</p>
            <dl>
              <div><dt>Business function</dt><dd>{x.business_function || '—'}</dd></div>
              <div><dt>Capabilities</dt><dd>{x.capabilities || '—'}</dd></div>
              <div><dt>Owner</dt><dd>{x.owner || '—'}</dd></div>
            </dl>
          </article>
        ))}
      </div>
      {items.length === 0 && <p className="muted">No bots yet. Import the RPA list CSV or add one above.</p>}
    </section>
  );
}
