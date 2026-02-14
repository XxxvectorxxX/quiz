-- Função para verificar se o usuário é admin (bypassa RLS)
CREATE OR REPLACE FUNCTION public.is_user_admin(user_id UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = user_id),
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter o usuário atual com bypass de RLS
CREATE OR REPLACE FUNCTION public.current_user_is_admin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Adicionar índice para melhorar performance de queries em is_admin
CREATE INDEX IF NOT EXISTS idx_profiles_admin ON public.profiles(id) WHERE is_admin = true;
