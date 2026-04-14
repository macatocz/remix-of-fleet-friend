
-- Create trigger for assigning admin to first user
CREATE TRIGGER on_auth_user_created_assign_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_first_admin();

-- Add user_id column to drivers to link drivers with auth users
ALTER TABLE public.drivers
  ADD COLUMN user_id UUID UNIQUE;
