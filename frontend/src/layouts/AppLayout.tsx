import { NavLink, Outlet } from 'react-router-dom';
import { Bot, BookOpen, Boxes, LayoutDashboard, LogOut } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
export default function AppLayout(){
 const {user,logout}=useAuth();
 const admin=user && ['SUPER_ADMIN','ADMIN','KNOWLEDGE_MANAGER'].includes(user.role);
 return <div className="app-shell">
   <aside className="sidebar" aria-label="Primary navigation">
     <div className="brand"><span className="brand-mark">K</span><div><strong>Knowledge Hub AI</strong><small>Connected intelligence</small></div></div>
     <nav>
       <NavLink to="/chat"><Bot size={20}/>AI Chat</NavLink>
       <NavLink to="/knowledge"><BookOpen size={20}/>Knowledge</NavLink>
       <NavLink to="/automations"><Boxes size={20}/>BOT Automations</NavLink>
       {admin && <NavLink to="/admin"><LayoutDashboard size={20}/>Admin</NavLink>}
     </nav>
     <div className="profile"><div className="avatar">{user?.name?.[0] || 'U'}</div><div className="profile-text"><strong>{user?.name}</strong><small>{user?.role}</small></div><button className="icon-btn" onClick={logout} aria-label="Log out"><LogOut size={18}/></button></div>
   </aside>
   <main id="main-content" className="main"><Outlet/></main>
 </div>
}
