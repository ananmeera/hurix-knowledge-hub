import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
export default function ProtectedRoute({children}:{children:React.ReactNode}){
  const {user,loading}=useAuth();
  if(loading) return <main className="centered"><p role="status">Loading…</p></main>;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}
