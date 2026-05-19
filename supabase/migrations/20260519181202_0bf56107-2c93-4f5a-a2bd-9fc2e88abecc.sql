UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE id = '31244795-f6b9-4928-b549-ba07f6cf0c40';

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('31244795-f6b9-4928-b549-ba07f6cf0c40', 'worker'),
  ('31244795-f6b9-4928-b549-ba07f6cf0c40', 'supervisor')
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE public.profiles
SET is_employee = true,
    account_type = 'employee',
    store_name = COALESCE(NULLIF(store_name,''), 'Capital Burgers')
WHERE id = '31244795-f6b9-4928-b549-ba07f6cf0c40';