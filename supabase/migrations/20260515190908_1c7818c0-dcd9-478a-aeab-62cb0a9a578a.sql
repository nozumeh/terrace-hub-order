-- 1) Revocar ejecución pública (PUBLIC) en todas las funciones expuestas
REVOKE EXECUTE ON FUNCTION public.accept_employee_invite(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.promote_user_to_admin_by_email(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.revoke_admin_by_email(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.setup_account(text, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.avg_delivery_seconds_for_floor(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_invitation_by_token(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.import_menu_from_csv(uuid, jsonb) FROM PUBLIC, anon, authenticated;

-- Funciones internas (triggers / helpers) — nadie debería llamarlas vía API
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_promo_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.orders_set_delivered_at() FROM PUBLIC, anon, authenticated;

-- 2) Otorgar EXECUTE solo a los roles correctos

-- Solo usuarios autenticados (validan permisos internamente con auth.uid())
GRANT EXECUTE ON FUNCTION public.accept_employee_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.promote_user_to_admin_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_admin_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.setup_account(text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.avg_delivery_seconds_for_floor(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.import_menu_from_csv(uuid, jsonb) TO authenticated;

-- Visitantes sin sesión necesitan poder previsualizar una invitación por token antes de registrarse
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO anon, authenticated;

-- handle_new_user / generate_promo_code / orders_set_delivered_at:
-- son llamadas únicamente por triggers / otras funciones del sistema.
-- No se otorga ningún permiso adicional (solo el owner/postgres puede invocarlas).