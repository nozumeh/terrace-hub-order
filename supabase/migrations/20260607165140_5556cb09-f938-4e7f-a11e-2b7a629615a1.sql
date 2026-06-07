CREATE TABLE public.runner_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL,
  runner_id UUID,
  message TEXT NOT NULL,
  sent_by UUID NOT NULL,
  is_broadcast BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.runner_messages TO authenticated;
GRANT ALL ON public.runner_messages TO service_role;

ALTER TABLE public.runner_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Runner messages owner manage" ON public.runner_messages
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = runner_messages.restaurant_id AND r.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = runner_messages.restaurant_id AND r.owner_id = auth.uid()
  )
);

CREATE POLICY "Runner messages runner read" ON public.runner_messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.food_runners fr
    WHERE fr.id = runner_messages.runner_id AND fr.user_id = auth.uid()
  )
  OR (
    runner_messages.is_broadcast = true
    AND EXISTS (
      SELECT 1 FROM public.food_runners fr
      JOIN public.restaurants r ON r.id = fr.restaurant_id
      WHERE fr.user_id = auth.uid() AND r.id = runner_messages.restaurant_id
    )
  )
);