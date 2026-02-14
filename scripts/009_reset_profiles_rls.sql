-- RESET: Remover TODAS as policies de profiles e recriar corretamente

-- Desabilitar RLS temporariamente para limpar tudo
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Remover todas as policies existentes
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can create questions" ON public.questions;
DROP POLICY IF EXISTS "Admins can view all logs" ON public.admin_logs;
DROP POLICY IF EXISTS "Admins can create logs" ON public.admin_logs;
DROP POLICY IF EXISTS "Users can read own profiles" ON public.profiles;
DROP POLICY IF EXISTS "Read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Select own profile" ON public.profiles;

-- Reabilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ===== POLICIES PARA PROFILES TABLE =====

-- 1. Usuários SEMPRE podem ler SEU PRÓPRIO profile (sem recursão)
CREATE POLICY "users_read_own_profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- 2. Admins podem ler TODOS os profiles (via SECURITY DEFINER function, sem recursão)
CREATE POLICY "admins_read_all_profiles"
  ON public.profiles FOR SELECT
  USING (public.current_user_is_admin());

-- 3. Usuários podem atualizar SEU PRÓPRIO profile
CREATE POLICY "users_update_own_profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ===== POLICIES PARA QUESTIONS TABLE =====
DROP POLICY IF EXISTS "Only admins can create questions" ON public.questions;

CREATE POLICY "only_admins_insert_questions"
  ON public.questions FOR INSERT
  WITH CHECK (public.current_user_is_admin());

CREATE POLICY "only_admins_update_questions"
  ON public.questions FOR UPDATE
  USING (public.current_user_is_admin());

CREATE POLICY "only_admins_delete_questions"
  ON public.questions FOR DELETE
  USING (public.current_user_is_admin());

-- Todos podem LER questions
CREATE POLICY "anyone_read_questions"
  ON public.questions FOR SELECT
  USING (true);

-- ===== POLICIES PARA ADMIN_LOGS TABLE =====
DROP POLICY IF EXISTS "Admins can view all logs" ON public.admin_logs;
DROP POLICY IF EXISTS "Admins can create logs" ON public.admin_logs;

CREATE POLICY "admins_read_logs"
  ON public.admin_logs FOR SELECT
  USING (public.current_user_is_admin());

CREATE POLICY "admins_insert_logs"
  ON public.admin_logs FOR INSERT
  WITH CHECK (public.current_user_is_admin());
