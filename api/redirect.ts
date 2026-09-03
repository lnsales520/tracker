import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

// We use the anon key here, but in production, if RLS is enabled, you might need a service_role key
// to insert clicks if unauthenticated users don't have insert access to the clicks table.
// However, the SQL script disables RLS, so anon key will work fine for inserting clicks.
export const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  const code = req.query.code;

  if (!code) {
    return res.status(400).send('Código não fornecido');
  }

  try {
    // Busca o link pelo código curto
    const { data: link, error } = await supabase
      .from('links')
      .select('*')
      .eq('short_code', code)
      .single();

    if (error || !link) {
      return res.status(404).send('Link não encontrado');
    }

    // Extrai dados para Analytics
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const country = req.headers['x-vercel-ip-country'] || 'Desconhecido';
    const city = req.headers['x-vercel-ip-city'] || 'Desconhecida';
    const userAgent = req.headers['user-agent'] || 'Desconhecido';
    const referrer = req.headers['referer'] || 'Direto';

    // Para capturar UTMs, idealmente pegaríamos da URL da requisição se estivesse lá.
    // Como a rota é algo como /r/abc123?utm_source=facebook
    const utm_source = req.query.utm_source || null;
    const utm_medium = req.query.utm_medium || null;
    const utm_campaign = req.query.utm_campaign || null;

    // Registra o clique de forma assíncrona para não atrasar o redirecionamento
    // Numa Vercel Function, await é recomendado para garantir que a promessa conclua antes da função morrer
    await supabase.from('clicks').insert([
      {
        link_id: link.id,
        country: country,
        city: city,
        utm_source: utm_source,
        utm_medium: utm_medium,
        utm_campaign: utm_campaign,
        referrer: referrer,
        user_agent: userAgent
      }
    ]);

    // Redireciona para o destino
    return res.redirect(302, link.destination_url);

  } catch (err) {
    console.error(err);
    return res.status(500).send('Erro interno');
  }
}
