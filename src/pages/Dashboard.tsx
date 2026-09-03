import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { BarChart3, Copy, Check, Trash2, Folder, Plus, Edit2, X, FolderInput, Globe, LayoutDashboard, Link as LinkIcon, Target } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';

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

type ClickData = {
  id: string;
  country: string | null;
  utm_source: string | null;
  created_at: string;
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'links'>('overview');

  const [links, setLinks] = useState<LinkData[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clicks, setClicks] = useState<ClickData[]>([]);
  
  const [selectedProject, setSelectedProject] = useState<string | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  // Folder Management State
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [movingLinkId, setMovingLinkId] = useState<string | null>(null);

  // Global Dashboard State
  const [startDate, setStartDate] = useState<string>(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    
    // Busca Projetos
    const { data: projectsData } = await supabase.from('projects').select('*').order('created_at', { ascending: true });
    if (projectsData) setProjects(projectsData);

    // Busca Links
    const { data: linksData, error: linksError } = await supabase.from('links').select('*').order('created_at', { ascending: false });
    if (linksError || !linksData) {
      console.error(linksError);
      setLoading(false);
      return;
    }

    // Busca todos os cliques para o Dashboard Global
    const { data: clicksData } = await supabase.from('clicks').select('id, link_id, country, utm_source, created_at');
    if (clicksData) setClicks(clicksData);

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

  // --- Funções de Links ---
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

  const handleMoveLink = async (linkId: string, projectId: string | null) => {
    const { error } = await supabase.from('links').update({ project_id: projectId }).eq('id', linkId);
    if (!error) {
      setLinks(links.map(l => l.id === linkId ? { ...l, project_id: projectId } : l));
      setMovingLinkId(null);
    } else {
      alert('Erro ao mover link.');
    }
  };

  // --- Funções de Pastas ---
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
      setLinks(links.map(l => l.project_id === id ? { ...l, project_id: null } : l));
    } else {
      alert('Erro ao excluir: ' + error.message);
    }
  };

  // --- Cálculos do Dashboard Global ---
  const filteredClicks = useMemo(() => {
    if (!startDate || !endDate) return clicks;
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T23:59:59`);
    return clicks.filter(c => {
      const clickDate = new Date(c.created_at);
      return clickDate >= start && clickDate <= end;
    });
  }, [clicks, startDate, endDate]);

  const globalChartData = useMemo(() => {
    const counts = filteredClicks.reduce((acc: Record<string, number>, click) => {
      const date = format(startOfDay(new Date(click.created_at)), 'dd/MM/yyyy');
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([date, count]) => ({ date, count }));
  }, [filteredClicks]);

  const topCountries = useMemo(() => {
    const counts = filteredClicks.reduce((acc: Record<string, number>, click) => {
      const country = click.country || 'Desconhecido';
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [filteredClicks]);

  const topSources = useMemo(() => {
    const counts = filteredClicks.reduce((acc: Record<string, number>, click) => {
      const source = click.utm_source || 'Direto/Sem UTM';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [filteredClicks]);

  const filteredLinks = selectedProject === 'all' 
    ? links 
    : selectedProject === 'none'
      ? links.filter(l => !l.project_id)
      : links.filter(l => l.project_id === selectedProject);

  if (loading) {
    return <div className="text-center py-10">Carregando dados...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Painel Geral</h1>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'overview' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Visão Geral
        </button>
        <button
          onClick={() => setActiveTab('links')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'links' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <LinkIcon className="w-4 h-4" />
          Meus Links e Pastas
        </button>
      </div>

      {/* --- ABA VISÃO GERAL --- */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-wrap gap-4 items-center justify-between shadow-sm">
            <h2 className="font-bold text-slate-700">Filtro Global</h2>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500 font-medium">De:</span>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="text-sm border border-slate-300 rounded-md py-1.5 px-2 outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500 font-medium">Até:</span>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="text-sm border border-slate-300 rounded-md py-1.5 px-2 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-center items-center">
              <div className="text-slate-500 font-medium mb-1">Total de Links Ativos</div>
              <div className="text-4xl font-bold text-blue-600">{links.length}</div>
            </div>
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-center items-center">
              <div className="text-slate-500 font-medium mb-1">Cliques no Período</div>
              <div className="text-4xl font-bold text-emerald-600">{filteredClicks.length}</div>
            </div>
            <div className="lg:col-span-2 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-500" />
                Tráfego Geral ao Longo do Tempo
              </h3>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={globalChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{fontSize: 10, fill: '#64748b'}} tickMargin={10} axisLine={false} tickLine={false} />
                    <YAxis tick={{fontSize: 10, fill: '#64748b'}} width={30} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                    <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{r: 3, fill: '#3b82f6', strokeWidth: 0}} name="Cliques Globais" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-500" />
                Top Países Globais
              </h3>
              {topCountries.length > 0 ? (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topCountries} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" tick={{fontSize: 11, fill: '#475569'}} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '12px' }} />
                      <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} name="Cliques" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-slate-400 text-sm">Sem dados no período</div>
              )}
            </div>

            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-500" />
                Top Origens (UTMs Globais)
              </h3>
              {topSources.length > 0 ? (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topSources} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" tick={{fontSize: 11, fill: '#475569'}} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '12px' }} />
                      <Bar dataKey="count" fill="#a855f7" radius={[0, 4, 4, 0]} barSize={20} name="Cliques" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-slate-400 text-sm">Sem dados no período</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- ABA MEUS LINKS E PASTAS --- */}
      {activeTab === 'links' && (
        <div className="flex flex-col md:flex-row gap-6 animate-in fade-in duration-300">
          <div className="w-full md:w-64 shrink-0">
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
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

          <div className="flex-1">
            {filteredLinks.length === 0 ? (
              <div className="bg-white p-8 rounded-lg border border-slate-200 text-center shadow-sm">
                <p className="text-slate-500 mb-4">Nenhum link encontrado nesta visualização.</p>
                <Link to="/links/new" className="text-blue-600 font-medium hover:underline">Criar novo link</Link>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-slate-200 overflow-visible shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
                      <th className="py-3 px-4 font-medium rounded-tl-lg">Título / URL Original</th>
                      <th className="py-3 px-4 font-medium">Link Curto</th>
                      <th className="py-3 px-4 font-medium">Cliques</th>
                      <th className="py-3 px-4 font-medium text-right rounded-tr-lg">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLinks.map((link) => (
                      <tr key={link.id} className="border-b border-slate-100 hover:bg-slate-50 relative group">
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">{link.title || 'Sem título'}</div>
                          <div className="text-xs text-slate-400 truncate max-w-[150px] md:max-w-[200px] lg:max-w-xs">{link.destination_url}</div>
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
                        <td className="py-3 px-4 text-right flex justify-end gap-2 relative">
                          <button
                            onClick={() => setMovingLinkId(movingLinkId === link.id ? null : link.id)}
                            className="inline-flex items-center gap-1 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-3 rounded-md transition-colors"
                            title="Mover para pasta"
                          >
                            <FolderInput className="w-4 h-4" />
                          </button>
                          <Link 
                            to={`/links/${link.id}`}
                            className="inline-flex items-center gap-1 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-3 rounded-md transition-colors"
                            title="Estatísticas"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </Link>
                          <button 
                            onClick={() => handleDeleteLink(link.id)}
                            className="inline-flex items-center gap-1 text-sm bg-red-50 hover:bg-red-100 text-red-600 py-1.5 px-3 rounded-md transition-colors"
                            title="Excluir link"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          {/* Menu flutuante de mover pasta */}
                          {movingLinkId === link.id && (
                            <div className="absolute right-0 top-12 w-48 bg-white border border-slate-200 rounded-md shadow-lg z-50 py-1 max-h-64 overflow-y-auto">
                              <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 sticky top-0 bg-white">
                                Mover para
                              </div>
                              <button 
                                onClick={() => handleMoveLink(link.id, null)}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${!link.project_id ? 'text-blue-600 font-medium' : 'text-slate-700'}`}
                              >
                                Sem Pasta
                              </button>
                              {projects.map(p => (
                                <button 
                                  key={p.id}
                                  onClick={() => handleMoveLink(link.id, p.id)}
                                  className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 truncate ${link.project_id === p.id ? 'text-blue-600 font-medium' : 'text-slate-700'}`}
                                >
                                  {p.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
