import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Dashboard from './pages/Dashboard';
import NewLink from './pages/NewLink';
import LinkDetails from './pages/LinkDetails';
import Login from './pages/Login';
import { Link2, LogOut } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Carregando...</div>;
  }

  if (!session) {
    return <Login />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 font-bold text-xl text-blue-600">
              <Link2 className="w-6 h-6" />
              Golynk
            </Link>
            <nav className="flex items-center gap-4">
              <Link to="/" className="text-slate-600 hover:text-slate-900 font-medium text-sm sm:text-base">Dashboard</Link>
              <Link to="/links/new" className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium text-sm sm:text-base hover:bg-blue-700 transition-colors">Criar Link</Link>
              <button 
                onClick={() => supabase.auth.signOut()}
                className="text-slate-400 hover:text-red-500 p-2"
                title="Sair"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </nav>
          </div>
        </header>
        
        <main className="max-w-5xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/links/new" element={<NewLink />} />
            <Route path="/links/:id" element={<LinkDetails />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
