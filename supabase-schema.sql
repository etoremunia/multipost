-- Ejecuta este SQL en Supabase > SQL Editor > New Query

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  password_hash text NOT NULL,
  plan text DEFAULT 'gratis',
  created_at timestamptz DEFAULT now()
);

-- Tabla de tokens de plataformas
CREATE TABLE IF NOT EXISTS platform_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email text NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  platform text NOT NULL,  -- 'youtube', 'tiktok', 'instagram'
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_email, platform)
);

-- Tabla de publicaciones
CREATE TABLE IF NOT EXISTS posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email text NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  filename text NOT NULL,
  title text,
  description text,
  platforms text[] NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Activar Row Level Security (RLS) - importante para seguridad
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Políticas: solo la anon key puede leer/escribir (nuestras functions)
CREATE POLICY "Allow all via anon" ON users FOR ALL USING (true);
CREATE POLICY "Allow all via anon" ON platform_tokens FOR ALL USING (true);
CREATE POLICY "Allow all via anon" ON posts FOR ALL USING (true);
