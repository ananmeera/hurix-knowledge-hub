import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import type { User } from '../types';

type AuthValue = { user:User|null; loading:boolean; refresh:()=>Promise<void>; logout:()=>Promise<void> };
const AuthContext = createContext<AuthValue>({user:null,loading:true,refresh:async()=>{},logout:async()=>{}});
export function AuthProvider({children}:{children:React.ReactNode}){
  const [user,setUser]=useState<User|null>(null); const [loading,setLoading]=useState(true);
  const refresh=async()=>{ try{setUser(await api.me())}catch{setUser(null)}finally{setLoading(false)} };
  useEffect(()=>{refresh()},[]);
  const logout=async()=>{await api.logout();setUser(null)};
  return <AuthContext.Provider value={{user,loading,refresh,logout}}>{children}</AuthContext.Provider>;
}
export const useAuth=()=>useContext(AuthContext);
