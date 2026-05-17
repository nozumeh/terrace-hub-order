
-- 1. Fix mutable search_path on pgmq helpers
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;

-- 2. Revoke broad EXECUTE on all SECURITY DEFINER functions, then grant per-role
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.generate_promo_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.accept_employee_invite(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.setup_account(text, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.promote_user_to_admin_by_email(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.revoke_admin_by_email(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.avg_delivery_seconds_for_floor(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_invitation_by_token(text) FROM PUBLIC;

-- 3. Re-grant where appropriate
GRANT EXECUTE ON FUNCTION public.accept_employee_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.setup_account(text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.promote_user_to_admin_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_admin_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.avg_delivery_seconds_for_floor(uuid, text) TO authenticated;
-- get_invitation_by_token is read by the invite landing page before sign-in
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO anon, authenticated;
