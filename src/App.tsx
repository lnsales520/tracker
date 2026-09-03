import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import NewLink from './pages/NewLink';
import LinkDetails from './pages/LinkDetails';
import { Link2 } from 'lucide-react';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 font-bold text-xl text-blue-600">
              <Link2 className="w-6 h-6" />
              Tracker
            </Link>
            <nav className="flex gap-4">
              <Link to="/" className="text-slate-600 hover:text-slate-900 font-medium">Dashboard</Link>
              <Link to="/links/new" className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors">Criar Link</Link>
            </nav>
          </div>
        </header>
        
        <main className="max-w-5xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/links/new" element={<NewLink />} />
            <Route path="/links/:id" element={<LinkDetails />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
