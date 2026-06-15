
CREATE TABLE public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES public.menu_items(id) ON DELETE CASCADE,
  stars smallint NOT NULL CHECK (stars BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One restaurant rating per (order, user) and one item rating per (order, user, item)
CREATE UNIQUE INDEX ratings_unique_restaurant_per_order
  ON public.ratings (order_id, user_id) WHERE menu_item_id IS NULL;
CREATE UNIQUE INDEX ratings_unique_item_per_order
  ON public.ratings (order_id, user_id, menu_item_id) WHERE menu_item_id IS NOT NULL;

CREATE INDEX ratings_restaurant_idx ON public.ratings (restaurant_id);
CREATE INDEX ratings_menu_item_idx ON public.ratings (menu_item_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ratings TO authenticated;
GRANT ALL ON public.ratings TO service_role;

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Users can only view their own raw ratings (aggregates go through views below)
CREATE POLICY "Users can view their own ratings"
  ON public.ratings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ratings"
  ON public.ratings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings"
  ON public.ratings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings"
  ON public.ratings FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER ratings_set_updated_at
  BEFORE UPDATE ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION public.orders_set_updated_at();

-- Public aggregate views (owned by postgres, bypass row RLS while exposing no user_id)
CREATE OR REPLACE VIEW public.restaurant_ratings_summary AS
SELECT
  restaurant_id,
  ROUND(AVG(stars)::numeric, 2) AS avg_stars,
  COUNT(*)::int AS rating_count
FROM public.ratings
WHERE menu_item_id IS NULL
GROUP BY restaurant_id;

CREATE OR REPLACE VIEW public.menu_item_ratings_summary AS
SELECT
  menu_item_id,
  ROUND(AVG(stars)::numeric, 2) AS avg_stars,
  COUNT(*)::int AS rating_count
FROM public.ratings
WHERE menu_item_id IS NOT NULL
GROUP BY menu_item_id;

GRANT SELECT ON public.restaurant_ratings_summary TO anon, authenticated;
GRANT SELECT ON public.menu_item_ratings_summary TO anon, authenticated;
