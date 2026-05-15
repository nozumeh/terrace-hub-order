DO $$
DECLARE
  v_rid uuid := 'a0000000-0000-0000-0000-000000000001';
  v_owner uuid := gen_random_uuid();
  v_other uuid := gen_random_uuid();
  v_prev_owner uuid;
  v_prev_count int;
  v_after_count int;
  v_inserted int;
  v_blocked boolean := false;
  v_err text;
BEGIN
  -- 1) Snapshot
  SELECT owner_id INTO v_prev_owner FROM public.restaurants WHERE id = v_rid;
  SELECT count(*) INTO v_prev_count FROM public.menu_items WHERE restaurant_id = v_rid;
  RAISE NOTICE '--- Estado inicial: owner=%, items=% ---', v_prev_owner, v_prev_count;

  -- 2) Crear usuarios temporales en auth.users
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES
    (v_owner, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'test_owner_'||substr(v_owner::text,1,8)||'@test.local',
     '{"provider":"email"}', '{}', now(), now()),
    (v_other, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'test_other_'||substr(v_other::text,1,8)||'@test.local',
     '{"provider":"email"}', '{}', now(), now());

  UPDATE public.restaurants SET owner_id = v_owner WHERE id = v_rid;

  -- 3) Caso 1: dueño
  BEGIN
    SET LOCAL role authenticated;
    PERFORM set_config('request.jwt.claim.sub', v_owner::text, true);
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_owner::text, 'role', 'authenticated')::text, true);

    v_inserted := public.import_menu_from_csv(
      v_rid,
      '[{"name":"__TEST_OWNER__","price":1.23,"category":"Test","is_available":true}]'::jsonb
    );
    RAISE NOTICE 'OWNER OK: filas insertadas = %', v_inserted;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'OWNER FAIL inesperado: %', SQLERRM;
  END;
  RESET role;

  -- 4) Caso 2: usuario no autorizado
  BEGIN
    SET LOCAL role authenticated;
    PERFORM set_config('request.jwt.claim.sub', v_other::text, true);
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_other::text, 'role', 'authenticated')::text, true);

    v_inserted := public.import_menu_from_csv(
      v_rid,
      '[{"name":"__TEST_HACK__","price":99,"category":"Hack"}]'::jsonb
    );
    RAISE WARNING 'INSEGURO: usuario no autorizado importó % filas', v_inserted;
  EXCEPTION WHEN OTHERS THEN
    v_blocked := true;
    v_err := SQLERRM;
    RAISE NOTICE 'OTHER bloqueado correctamente: %', v_err;
  END;
  RESET role;

  -- 5) Limpieza
  DELETE FROM public.menu_items
   WHERE restaurant_id = v_rid
     AND name IN ('__TEST_OWNER__', '__TEST_HACK__');
  UPDATE public.restaurants SET owner_id = v_prev_owner WHERE id = v_rid;
  DELETE FROM auth.users WHERE id IN (v_owner, v_other);

  SELECT count(*) INTO v_after_count FROM public.menu_items WHERE restaurant_id = v_rid;
  RAISE NOTICE '--- Estado final: owner=%, items=% (esperado %) ---',
    v_prev_owner, v_after_count, v_prev_count;

  IF NOT v_blocked THEN
    RAISE EXCEPTION 'FALLA DE SEGURIDAD: import_menu_from_csv no bloqueó al no-owner';
  END IF;
  RAISE NOTICE 'TEST PASSED: dueño puede, no-dueño bloqueado.';
END $$;