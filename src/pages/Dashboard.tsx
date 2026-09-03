import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { BarChart3, ExternalLink, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';

type LinkData = {
  id: string;
  title: string | null;
  short_code: string;
  destination_url: string;
  created_at: string;
  click_count?: number;
};

export default function Dashboard() {
  const [links, setLinks] = useState<LinkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetchLinks();
  }, []);

  async function fetchLinks() {
    setLoading(true);
    // Para simplificar, buscamos links e um count de clicks separadamente ou agrupado se usarmos rpc
    // Aqui faremos um select basico e depois count, ou podemos fazer um select nos clicks com count
    
    const { data: linksData, error: linksError } = await supabase
      .from('links')
      .select('*')
      .order('created_at', { ascending: false });

    if (linksError || !linksData) {
      console.error(linksError);
      setLoading(false);
      return;
    }

    // Busca contagem de cliques (Ideal seria uma view no Supabase, mas para simplicidade fazemos aqui)
    const { data: clicksData, error: clicksError } = await supabase
      .from('clicks')
      .select('link_id');

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

  const handleCopy = (code: string) => {
    const url = `${window.location.origin}/r/${code}`;
    navigator.clipboard.writeText(url);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return <div className="text-center py-10">Carregando links...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Seus Links</h1>
      </div>

      {links.length === 0 ? (
        <div className="bg-white p-8 rounded-lg border border-slate-200 text-center">
          <p className="text-slate-500 mb-4">Você ainda não tem links cadastrados.</p>
          <Link to="/links/new" className="text-blue-600 font-medium hover:underline">Criar primeiro link</Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
                <th className="py-3 px-4 font-medium">Título / URL Original</th>
                <th className="py-3 px-4 font-medium">Link Curto</th>
                <th className="py-3 px-4 font-medium">Cliques</th>
                <th className="py-3 px-4 font-medium">Criado em</th>
                <th className="py-3 px-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <tr key={link.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-800">{link.title || 'Sem título'}</div>
                    <div className="text-xs text-slate-400 truncate max-w-xs">{link.destination_url}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-blue-600">/r/{link.short_code}</span>
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
                  <td className="py-3 px-4 text-sm text-slate-500">
                    {format(new Date(link.created_at), 'dd/MM/yyyy')}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link 
                      to={`/links/${link.id}`}
                      className="inline-flex items-center gap-1 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-3 rounded-md transition-colors"
                    >
                      <BarChart3 className="w-4 h-4" />
                      Estatísticas
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
