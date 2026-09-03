import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

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
          short_code: finalCode
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Código Curto Personalizado (Opcional)</label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-slate-300 bg-slate-50 text-slate-500 text-sm">
                seusite.com/r/
              </span>
              <input 
                type="text" 
                placeholder="deixe em branco para aleatório"
                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={shortCode}
                onChange={(e) => setShortCode(e.target.value)}
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">Apenas letras e números são recomendados.</p>
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
