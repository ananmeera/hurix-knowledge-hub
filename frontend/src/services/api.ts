const API_BASE = import.meta.env.VITE_API_BASE || '/api';

async function request<T>(path:string, options:RequestInit = {}):Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { credentials:'include', ...options, headers: { ...(options.body instanceof FormData ? {} : {'Content-Type':'application/json'}), ...(options.headers || {}) } });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try { const data = await res.json(); message = data.detail || message; } catch {}
    throw new Error(message);
  }
  return res.json();
}

export const api = {
  me: () => request<any>('/auth/me'),
  demoLogin: () => request<any>('/auth/demo-login', {method:'POST'}),
  logout: () => request('/auth/logout', {method:'POST'}),
  googleLoginUrl: `${API_BASE}/auth/google/login`,
  chat: (message:string, session_id?:number) => request<any>('/chat', {method:'POST', body:JSON.stringify({message,session_id})}),
  sessions: () => request<any[]>('/chat/sessions'),
  session: (id:number) => request<any[]>(`/chat/sessions/${id}`),
  feedback: (payload:any) => request('/feedback', {method:'POST', body:JSON.stringify(payload)}),
  automations: (q='') => request<any[]>(`/automations${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  documents: () => request<any[]>('/knowledge/documents'),
  document: (id:number) => request<any>(`/knowledge/documents/${id}`),
  approve: (id:number) => request<any>(`/knowledge/documents/${id}/approve`, {method:'POST'}),
  markOutdated: (id:number) => request<any>(`/knowledge/documents/${id}/outdated`, {method:'POST'}),
  upload: (data:FormData) => request<any>('/knowledge/documents/upload', {method:'POST', body:data}),
  dashboard: () => request<any>('/admin/dashboard')
};
