import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { BarChart3, Copy, Check, Trash2, Folder, Plus, Edit2, X } from 'lucide-react';

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

  // Folder Management State
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    
    const { data: projectsData } = await supabase.from('projects').select('*').order('created_at', { ascending: true });
    if (projectsData) setProjects(projectsData);

    const { data: linksData, error: linksError } = await supabase.from('links').select('*').order('created_at', { ascending: false });

    if (linksError || !linksData) {
      console.error(linksError);
      setLoading(false);
      return;
    }

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

  const handleDeleteLink = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este link e todos os seus cliques?')) return;
    const { error } = await supabase.from('links').delete().eq('id', id);
    if (!error) setLinks(links.filter(l => l.id !== id));
    else alert('Erro ao excluir o link.');
  };

  const handleCopy = (code: string) => {
    const url = `${window.location.origin}/${code}`;
    navigator.clipboard.writeText(url);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  // Folder Management Functions
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    const { data, error } = await supabase.from('projects').insert([{ name: newFolderName.trim() }]).select().single();
    if (data && !error) {
      setProjects([...projects, data]);
      setNewFolderName('');
      setIsCreatingFolder(false);
      setSelectedProject(data.id);
    } else if (error) {
      alert('Erro ao criar pasta: ' + error.message);
    }
  };

  const handleRenameFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFolderName.trim() || !editingFolderId) return;
    const { error } = await supabase.from('projects').update({ name: editFolderName.trim() }).eq('id', editingFolderId);
    if (!error) {
      setProjects(projects.map(p => p.id === editingFolderId ? { ...p, name: editFolderName.trim() } : p));
      setEditingFolderId(null);
    } else {
      alert('Erro ao renomear: ' + error.message);
    }
  };

  const handleDeleteFolder = async (id: string, name: string) => {
    if (!window.confirm(`Excluir a pasta "${name}"? Os links dela não serão apagados, ficarão "Sem Pasta".`)) return;
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (!error) {
      setProjects(projects.filter(p => p.id !== id));
      if (selectedProject === id) setSelectedProject('all');
      // Atualiza localmente os links que perderam a pasta
      setLinks(links.map(l => l.project_id === id ? { ...l, project_id: null } : l));
    } else {
      alert('Erro ao excluir: ' + error.message);
    }
  };

  const filteredLinks = selectedProject === 'all' 
    ? links 
    : selectedProject === 'none'
      ? links.filter(l => !l.project_id)
      : links.filter(l => l.project_id === selectedProject);

  if (loading) {
    return <div className="text-center py-10">Carregando dados...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Painel Geral</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar de Projetos */}
        <div className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Pastas</h2>
              <button onClick={() => setIsCreatingFolder(true)} className="text-blue-600 hover:text-blue-700" title="Nova Pasta">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-1">
              <button 
                onClick={() => setSelectedProject('all')}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${selectedProject === 'all' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'}`}
              >
                <Folder className="w-4 h-4" /> Todos os Links
              </button>

              {isCreatingFolder && (
                <form onSubmit={handleCreateFolder} className="flex items-center gap-2 px-2 py-1">
                  <input 
                    type="text" 
                    autoFocus
                    placeholder="Nome da pasta..."
                    className="flex-1 min-w-0 px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:border-blue-500"
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                  />
                  <button type="submit" className="text-green-600 hover:text-green-700" title="Salvar Pasta">
                    <Check className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => setIsCreatingFolder(false)} className="text-slate-400 hover:text-red-500" title="Cancelar">
                    <X className="w-4 h-4" />
                  </button>
                </form>
              )}

              {projects.map(proj => (
                <div key={proj.id} className={`group flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium ${selectedProject === proj.id ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'}`}>
                  {editingFolderId === proj.id ? (
                    <form onSubmit={handleRenameFolder} className="flex-1 flex items-center gap-2">
                      <input 
                        type="text" 
                        autoFocus
                        className="flex-1 min-w-0 px-1 py-0.5 text-sm border border-blue-300 rounded focus:outline-none"
                        value={editFolderName}
                        onChange={e => setEditFolderName(e.target.value)}
                      />
                      <button type="submit" className="text-green-600 hover:text-green-700" title="Salvar Novo Nome">
                        <Check className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => setEditingFolderId(null)} className="text-slate-400 hover:text-red-500" title="Cancelar">
                        <X className="w-4 h-4" />
                      </button>
                    </form>
                  ) : (
                    <>
                      <button onClick={() => setSelectedProject(proj.id)} className="flex-1 flex items-center gap-2 text-left truncate pr-2">
                        <Folder className="w-4 h-4 shrink-0" /> <span className="truncate">{proj.name}</span>
                      </button>
                      <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                        <button onClick={() => { setEditingFolderId(proj.id); setEditFolderName(proj.name); }} className="p-1 text-slate-400 hover:text-blue-600"><Edit2 className="w-3 h-3" /></button>
                        <button onClick={() => handleDeleteFolder(proj.id, proj.name)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </>
                  )}
                </div>
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
                          <span className="hidden sm:inline">Estatísticas</span>
                        </Link>
                        <button 
                          onClick={() => handleDeleteLink(link.id)}
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
