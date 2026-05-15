CREATE OR REPLACE FUNCTION public.avg_delivery_seconds_for_floor(_restaurant_id uuid, _floor text)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH samples AS (
    SELECT EXTRACT(EPOCH FROM (delivered_at - out_for_delivery_at))::numeric AS s
    FROM public.orders
    WHERE restaurant_id = _restaurant_id
      AND delivery_floor = _floor
      AND delivered_at IS NOT NULL
      AND out_for_delivery_at IS NOT NULL
    ORDER BY delivered_at DESC
    LIMIT 30
  )
  SELECT AVG(s) FROM samples WHERE s > 30 AND s < 3600;
$$;

REVOKE ALL ON FUNCTION public.avg_delivery_seconds_for_floor(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.avg_delivery_seconds_for_floor(uuid, text) TO authenticated;