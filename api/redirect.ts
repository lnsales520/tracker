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

    // Tenta fazer o parse da URL de destino para pegar UTMs "presas" nela (hardcoded)
    let destUrlObj;
    let finalDestination = link.destination_url;
    try {
      destUrlObj = new URL(link.destination_url);
    } catch (e) {
      // Ignora erro de parsing
    }

    // Para capturar UTMs: Prioridade 1 (URL encurtada) -> Prioridade 2 (URL de destino)
    const utm_source = req.query.utm_source || (destUrlObj ? destUrlObj.searchParams.get('utm_source') : null) || null;
    const utm_medium = req.query.utm_medium || (destUrlObj ? destUrlObj.searchParams.get('utm_medium') : null) || null;
    const utm_campaign = req.query.utm_campaign || (destUrlObj ? destUrlObj.searchParams.get('utm_campaign') : null) || null;

    // Se o usuário acessar o link encurtado com UTMs extras (ex: /V001?utm_source=insta),
    // vamos repassar isso para a URL final para que o Google Analytics do destino também registre
    if (destUrlObj) {
      if (req.query.utm_source) destUrlObj.searchParams.set('utm_source', req.query.utm_source);
      if (req.query.utm_medium) destUrlObj.searchParams.set('utm_medium', req.query.utm_medium);
      if (req.query.utm_campaign) destUrlObj.searchParams.set('utm_campaign', req.query.utm_campaign);
      finalDestination = destUrlObj.toString();
    }

    // Registra o clique
    const { error: insertError } = await supabase.from('clicks').insert([
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
    
    if (insertError) {
      console.error('Erro ao inserir clique:', insertError);
    }

    // Redireciona para o destino (agora podendo incluir UTMs extras repassadas)
    return res.redirect(302, finalDestination);

  } catch (err) {
    console.error(err);
    return res.status(500).send('Erro interno');
  }
}
