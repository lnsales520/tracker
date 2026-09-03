-- Habilita a extensão para gerar UUIDs, se já não estiver habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criação da tabela de links
CREATE TABLE links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    short_code TEXT UNIQUE NOT NULL,
    destination_url TEXT NOT NULL,
    title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criação da tabela de cliques (clicks)
CREATE TABLE clicks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    link_id UUID REFERENCES links(id) ON DELETE CASCADE,
    country TEXT,
    city TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    referrer TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhorar a performance de busca e nos filtros do dashboard
CREATE INDEX idx_clicks_link_id ON clicks(link_id);
CREATE INDEX idx_clicks_created_at ON clicks(created_at);

-- Opcional: Para deixar o banco sem Restrições de Nível de Linha (RLS) num primeiro momento
-- (Isso facilita o desenvolvimento, depois você pode criar Policies se adicionar Auth)
ALTER TABLE links DISABLE ROW LEVEL SECURITY;
ALTER TABLE clicks DISABLE ROW LEVEL SECURITY;
