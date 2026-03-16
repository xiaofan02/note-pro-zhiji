
-- Drop old policies and recreate for admin access
DROP POLICY IF EXISTS "Admins can manage config" ON public.system_config;

CREATE POLICY "Admins can manage config" ON public.system_config
  FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admins to read all ai_usage
CREATE POLICY "Admins can read all usage" ON public.ai_usage
  FOR SELECT TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to manage all user_roles  
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
