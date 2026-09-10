import { api } from '../services/api';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
export default function LoginPage(){
 const {refresh}=useAuth(); const nav=useNavigate();
 const demo=async()=>{await api.demoLogin();await refresh();nav('/chat')};
 return <main className="login-page" id="main-content">
   <section className="login-card" aria-labelledby="login-title">
     <div className="hero-logo">K</div>
     <p className="eyebrow">INTERNAL KNOWLEDGE ASSISTANT</p>
     <h1 id="login-title">Knowledge Hub AI</h1>
     <p className="lead">One intelligent door to organizational knowledge.</p>
     <a className="primary-btn google" href={api.googleLoginUrl}>Continue with Google</a>
     <p className="muted">Only approved organization Google accounts can access the application.</p>
     <div className="demo-box"><strong>Local hackathon demo</strong><p>Use demo login until Google OAuth credentials are configured.</p><button className="secondary-btn" onClick={demo}>Enter Demo Workspace</button></div>
   </section>
 </main>
}
