import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, ExternalLink, Calendar, MapPin, Target } from 'lucide-react';
import { format, subDays, startOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

type LinkInfo = {
  id: string;
  title: string | null;
  short_code: string;
  destination_url: string;
  created_at: string;
};

type ClickData = {
  id: string;
  country: string | null;
  city: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  created_at: string;
};

type TimeFilter = '7d' | '30d' | 'all';
type Grouping = 'day' | 'week' | 'month';

export default function LinkDetails() {
  const { id } = useParams<{ id: string }>();
  const [link, setLink] = useState<LinkInfo | null>(null);
  const [clicks, setClicks] = useState<ClickData[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('30d');
  const [grouping, setGrouping] = useState<Grouping>('day');

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  async function fetchData() {
    setLoading(true);
    
    const { data: linkData } = await supabase
      .from('links')
      .select('*')
      .eq('id', id)
      .single();
      
    if (linkData) setLink(linkData);

    const { data: clicksData } = await supabase
      .from('clicks')
      .select('*')
      .eq('link_id', id)
      .order('created_at', { ascending: true });

    if (clicksData) setClicks(clicksData);
    setLoading(false);
  }

  // Filtragem de Tempo
  const filteredClicks = useMemo(() => {
    if (timeFilter === 'all') return clicks;
    const days = timeFilter === '7d' ? 7 : 30;
    const cutoff = subDays(new Date(), days);
    return clicks.filter(c => new Date(c.created_at) >= cutoff);
  }, [clicks, timeFilter]);

  // Agrupamento para Gráfico de Linha (Cliques ao longo do tempo)
  const chartData = useMemo(() => {
    const counts = filteredClicks.reduce((acc: Record<string, number>, click) => {
      const date = new Date(click.created_at);
      let key = '';
      
      if (grouping === 'day') {
        key = format(startOfDay(date), 'dd/MM/yyyy');
      } else if (grouping === 'week') {
        key = format(startOfWeek(date, { weekStartsOn: 1 }), 'dd/MM/yyyy');
      } else {
        key = format(startOfMonth(date), 'MM/yyyy');
      }
      
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts).map(([date, count]) => ({ date, count }));
  }, [filteredClicks, grouping]);

  // Agrupamento para Países
  const countryData = useMemo(() => {
    const counts = filteredClicks.reduce((acc: Record<string, number>, click) => {
      const country = click.country || 'Desconhecido';
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredClicks]);

  // Agrupamento para UTM Source
  const utmSourceData = useMemo(() => {
    const counts = filteredClicks.reduce((acc: Record<string, number>, click) => {
      const source = click.utm_source || 'Direto/Sem UTM';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredClicks]);

  if (loading) return <div className="text-center py-10">Carregando dados...</div>;
  if (!link) return <div className="text-center py-10 text-red-500">Link não encontrado.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/" className="text-slate-400 hover:text-slate-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{link.title || 'Sem título'}</h1>
          <a href={link.destination_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-blue-600 hover:underline mt-1">
            {link.destination_url}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          <button onClick={() => setTimeFilter('7d')} className={`px-3 py-1.5 rounded-md text-sm font-medium ${timeFilter === '7d' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Últimos 7 dias</button>
          <button onClick={() => setTimeFilter('30d')} className={`px-3 py-1.5 rounded-md text-sm font-medium ${timeFilter === '30d' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Últimos 30 dias</button>
          <button onClick={() => setTimeFilter('all')} className={`px-3 py-1.5 rounded-md text-sm font-medium ${timeFilter === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Todo o período</button>
        </div>
        
        <div className="flex gap-2 items-center">
          <span className="text-sm text-slate-500 font-medium">Agrupar por:</span>
          <select 
            value={grouping} 
            onChange={(e) => setGrouping(e.target.value as Grouping)}
            className="text-sm border border-slate-300 rounded-md py-1.5 px-2 outline-none focus:border-blue-500"
          >
            <option value="day">Dia</option>
            <option value="week">Semana</option>
            <option value="month">Mês</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-center items-center">
          <div className="text-slate-500 font-medium mb-1">Total de Cliques no Período</div>
          <div className="text-4xl font-bold text-slate-800">{filteredClicks.length}</div>
        </div>

        <div className="md:col-span-2 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            Cliques ao longo do tempo
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} tickMargin={10} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize: 12, fill: '#64748b'}} tickMargin={10} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, fill: '#3b82f6', strokeWidth: 0}} activeDot={{r: 6}} name="Cliques" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-500" />
            Top Países
          </h3>
          {countryData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={countryData.slice(0, 5)} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" tick={{fontSize: 12, fill: '#475569'}} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                  <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} barSize={24} name="Cliques" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
             <div className="h-32 flex items-center justify-center text-slate-400">Sem dados</div>
          )}
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-500" />
            Origens (UTM Source)
          </h3>
          {utmSourceData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={utmSourceData.slice(0, 5)} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" tick={{fontSize: 12, fill: '#475569'}} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                  <Bar dataKey="count" fill="#a855f7" radius={[0, 4, 4, 0]} barSize={24} name="Cliques" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
             <div className="h-32 flex items-center justify-center text-slate-400">Sem dados</div>
          )}
        </div>
      </div>
    </div>
  );
}
