import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Schema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(6).max(200),
  name: z.string().max(120).optional().default(""),
  phone: z.string().max(40).optional().default(""),
  store_name: z.string().max(120).optional().default(""),
  store_floor: z.string().max(20).optional().default(""),
  store_id: z.string().max(120).optional().default(""),
  local_number: z.string().max(40).optional().default(""),
});

export const signUpEmployeeConfirmed = createServerFn({ method: "POST" })
  .inputValidator((input) => Schema.parse(input))
  .handler(async ({ data }) => {
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        name: data.name,
        phone: data.phone,
        account_type: "employee",
        store_name: data.store_name,
        store_floor: data.store_floor,
        store_id: data.store_id,
        local_number: data.local_number,
      },
    });
    if (error) throw new Error(error.message);
    return { ok: true, user_id: created.user?.id ?? null };
  });