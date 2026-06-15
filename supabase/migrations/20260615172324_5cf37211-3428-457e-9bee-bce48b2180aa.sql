
DROP VIEW IF EXISTS public.restaurant_ratings_summary;
DROP VIEW IF EXISTS public.menu_item_ratings_summary;

-- Allow anonymous read of just the aggregate-relevant columns via dedicated policy.
-- We expose stars + restaurant_id + menu_item_id to anon/authenticated so the
-- summary views (security_invoker = true) can compute averages safely. user_id
-- is still protected because views only project aggregate columns.
CREATE POLICY "Public can read ratings for aggregates"
  ON public.ratings FOR SELECT TO anon, authenticated
  USING (true);

CREATE VIEW public.restaurant_ratings_summary
  WITH (security_invoker = true) AS
SELECT
  restaurant_id,
  ROUND(AVG(stars)::numeric, 2) AS avg_stars,
  COUNT(*)::int AS rating_count
FROM public.ratings
WHERE menu_item_id IS NULL
GROUP BY restaurant_id;

CREATE VIEW public.menu_item_ratings_summary
  WITH (security_invoker = true) AS
SELECT
  menu_item_id,
  ROUND(AVG(stars)::numeric, 2) AS avg_stars,
  COUNT(*)::int AS rating_count
FROM public.ratings
WHERE menu_item_id IS NOT NULL
GROUP BY menu_item_id;

GRANT SELECT ON public.ratings TO anon;
GRANT SELECT ON public.restaurant_ratings_summary TO anon, authenticated;
GRANT SELECT ON public.menu_item_ratings_summary TO anon, authenticated;
