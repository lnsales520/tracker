-- 1. Criação da tabela de projetos (pastas)
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Adiciona a coluna project_id na tabela de links existente
ALTER TABLE links ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- 3. Desabilita RLS na nova tabela para manter a simplicidade atual
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
