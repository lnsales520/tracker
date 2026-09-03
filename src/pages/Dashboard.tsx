import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { BarChart3, Copy, Check, Trash2, Folder } from 'lucide-react';
import { format } from 'date-fns';

type Project = {
  id: string;
  name: string;
};

type LinkData = {
  id: string;
  title: string | null;
  short_code: string;
  destination_url: string;
  created_at: string;
  project_id: string | null;
  click_count?: number;
};

export default function Dashboard() {
  const [links, setLinks] = useState<LinkData[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | 'all'>('all');
  
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    
    // Fetch Projects
    const { data: projectsData } = await supabase.from('projects').select('*').order('created_at', { ascending: true });
    if (projectsData) setProjects(projectsData);

    // Fetch Links
    const { data: linksData, error: linksError } = await supabase
      .from('links')
      .select('*')
      .order('created_at', { ascending: false });

    if (linksError || !linksData) {
      console.error(linksError);
      setLoading(false);
      return;
    }

    // Fetch Click counts
    const { data: clicksData } = await supabase.from('clicks').select('link_id');
    const clickCounts = (clicksData || []).reduce((acc: any, click) => {
      acc[click.link_id] = (acc[click.link_id] || 0) + 1;
      return acc;
    }, {});

    const enrichedLinks = linksData.map(l => ({
      ...l,
      click_count: clickCounts[l.id] || 0
    }));

    setLinks(enrichedLinks);
    setLoading(false);
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este link e todos os seus cliques?')) return;
    
    const { error } = await supabase.from('links').delete().eq('id', id);
    if (!error) {
      setLinks(links.filter(l => l.id !== id));
    } else {
      alert('Erro ao excluir o link.');
    }
  };

  const handleCopy = (code: string) => {
    // Removemos o /r/ do código gerado
    const url = `${window.location.origin}/${code}`;
    navigator.clipboard.writeText(url);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const filteredLinks = selectedProject === 'all' 
    ? links 
    : links.filter(l => l.project_id === selectedProject);

  if (loading) {
    return <div className="text-center py-10">Carregando dados...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Seus Links</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar de Projetos */}
        <div className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Pastas / Projetos</h2>
            <div className="space-y-1">
              <button 
                onClick={() => setSelectedProject('all')}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${selectedProject === 'all' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'}`}
              >
                <Folder className="w-4 h-4" /> Todos os Links
              </button>
              {projects.map(proj => (
                <button 
                  key={proj.id}
                  onClick={() => setSelectedProject(proj.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${selectedProject === proj.id ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'}`}
                >
                  <Folder className="w-4 h-4" /> {proj.name}
                </button>
              ))}
              <button 
                onClick={() => setSelectedProject('none')}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${selectedProject === 'none' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'}`}
              >
                <Folder className="w-4 h-4 opacity-50" /> Sem Pasta
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Links */}
        <div className="flex-1">
          {filteredLinks.length === 0 ? (
            <div className="bg-white p-8 rounded-lg border border-slate-200 text-center">
              <p className="text-slate-500 mb-4">Nenhum link encontrado nesta visualização.</p>
              <Link to="/links/new" className="text-blue-600 font-medium hover:underline">Criar novo link</Link>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
                    <th className="py-3 px-4 font-medium">Título / URL Original</th>
                    <th className="py-3 px-4 font-medium">Link Curto</th>
                    <th className="py-3 px-4 font-medium">Cliques</th>
                    <th className="py-3 px-4 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLinks.map((link) => (
                    <tr key={link.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{link.title || 'Sem título'}</div>
                        <div className="text-xs text-slate-400 truncate max-w-[200px] lg:max-w-xs">{link.destination_url}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {/* Exibição atualizada sem o /r/ */}
                          <span className="font-medium text-blue-600">/{link.short_code}</span>
                          <button 
                            onClick={() => handleCopy(link.short_code)}
                            className="text-slate-400 hover:text-slate-600"
                            title="Copiar link"
                          >
                            {copied === link.short_code ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">
                        {link.click_count}
                      </td>
                      <td className="py-3 px-4 text-right flex justify-end gap-2">
                        <Link 
                          to={`/links/${link.id}`}
                          className="inline-flex items-center gap-1 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-3 rounded-md transition-colors"
                        >
                          <BarChart3 className="w-4 h-4" />
                          Estatísticas
                        </Link>
                        <button 
                          onClick={() => handleDelete(link.id)}
                          className="inline-flex items-center gap-1 text-sm bg-red-50 hover:bg-red-100 text-red-600 py-1.5 px-3 rounded-md transition-colors"
                          title="Excluir link"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
