-- Remover policy quebrada e recriá-la com função SECURITY DEFINER
DROP POLICY IF EXISTS "Only admins can create questions" ON public.questions;

CREATE POLICY "Only admins can create questions"
  ON public.questions FOR INSERT
  WITH CHECK (public.current_user_is_admin());

-- Remover policies de admin_logs e recriá-las com função SECURITY DEFINER
DROP POLICY IF EXISTS "Admins can view all logs" ON public.admin_logs;
DROP POLICY IF EXISTS "Admins can create logs" ON public.admin_logs;

CREATE POLICY "Admins can view all logs"
  ON public.admin_logs FOR SELECT
  USING (public.current_user_is_admin());

CREATE POLICY "Admins can create logs"
  ON public.admin_logs FOR INSERT
  WITH CHECK (public.current_user_is_admin());

-- Usuários podem ler seu próprio profile (necessário para middleware ler is_admin)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Adicionar policy para que admins possam ler profiles (para admin panel)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.current_user_is_admin());
