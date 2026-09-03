import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type Project = {
  id: string;
  name: string;
};

function generateRandomCode(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function NewLink() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [title, setTitle] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [shortCode, setShortCode] = useState('');
  
  // Projects
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>('');
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    const { data } = await supabase.from('projects').select('*').order('name');
    if (data) setProjects(data);
  }

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    const { data, error } = await supabase.from('projects').insert([{ name: newProjectName.trim() }]).select().single();
    if (data && !error) {
      setProjects([...projects, data]);
      setProjectId(data.id);
      setIsCreatingProject(false);
      setNewProjectName('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let finalCode = shortCode.trim();
    if (!finalCode) {
      finalCode = generateRandomCode();
    }

    try {
      const { error: insertError } = await supabase.from('links').insert([
        {
          title: title || null,
          destination_url: destinationUrl,
          short_code: finalCode,
          project_id: projectId || null
        }
      ]);

      if (insertError) {
        if (insertError.code === '23505') { // Unique violation
          setError('Este código curto já está em uso. Tente outro.');
        } else {
          setError('Erro ao criar o link. Verifique os dados.');
        }
        setLoading(false);
        return;
      }

      navigate('/');
    } catch (err) {
      console.error(err);
      setError('Erro inesperado.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Criar Novo Link</h1>
      
      <div className="bg-white p-6 rounded-lg border border-slate-200">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">URL de Destino *</label>
            <input 
              type="url" 
              required
              placeholder="https://exemplo.com/pagina"
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Título / Nota (Opcional)</label>
            <input 
              type="text" 
              placeholder="Ex: Campanha de Verão"
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Pasta / Projeto (Opcional)</label>
            {isCreatingProject ? (
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Nome da nova pasta"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  autoFocus
                />
                <button type="button" onClick={handleCreateProject} className="px-3 py-2 bg-slate-800 text-white rounded-md text-sm">Salvar</button>
                <button type="button" onClick={() => setIsCreatingProject(false)} className="px-3 py-2 bg-slate-200 text-slate-700 rounded-md text-sm">Cancelar</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select 
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                >
                  <option value="">Nenhuma pasta</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <button 
                  type="button" 
                  onClick={() => setIsCreatingProject(true)}
                  className="px-3 py-2 border border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-md text-sm font-medium text-slate-700 whitespace-nowrap"
                >
                  + Nova Pasta
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Código Curto Personalizado (Opcional)</label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-slate-300 bg-slate-50 text-slate-500 text-sm">
                seusite.com/
              </span>
              <input 
                type="text" 
                placeholder="deixe em branco para aleatório"
                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={shortCode}
                onChange={(e) => setShortCode(e.target.value)}
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">Apenas letras e números são recomendados. Ex: promo24</p>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={() => navigate('/')}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
