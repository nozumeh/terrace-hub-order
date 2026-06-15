export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bcv_rates: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          id: string
          notes: string | null
          rate: number
          scheduled_for: string | null
          scheduled_rate: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          notes?: string | null
          rate: number
          scheduled_for?: string | null
          scheduled_rate?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          notes?: string | null
          rate?: number
          scheduled_for?: string | null
          scheduled_rate?: number | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      employee_invitations: {
        Row: {
          created_at: string
          created_by: string
          email: string | null
          expires_at: string
          id: string
          restaurant_id: string
          staff_role: string
          store_floor: string
          store_name: string
          token: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string
          email?: string | null
          expires_at?: string
          id?: string
          restaurant_id: string
          staff_role?: string
          store_floor?: string
          store_name?: string
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          email?: string | null
          expires_at?: string
          id?: string
          restaurant_id?: string
          staff_role?: string
          store_floor?: string
          store_name?: string
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      food_runners: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string
          restaurant_id: string
          schedule: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string
          restaurant_id: string
          schedule?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string
          restaurant_id?: string
          schedule?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      menu_categories: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          restaurant_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          restaurant_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          restaurant_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_extras: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string
          name: string
          price: number
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id: string
          name: string
          price?: number
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string
          name?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_extras_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_removable_options: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_removable_options_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category: string
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean
          name: string
          options: Json | null
          price: number
          restaurant_id: string
          stock_quantity: number | null
        }
        Insert: {
          category?: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name: string
          options?: Json | null
          price: number
          restaurant_id: string
          stock_quantity?: number | null
        }
        Update: {
          category?: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name?: string
          options?: Json | null
          price?: number
          restaurant_id?: string
          stock_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          customizations: Json
          id: string
          menu_item_id: string
          name: string
          order_id: string
          quantity: number
          subtotal: number
          unit_price: number
        }
        Insert: {
          customizations?: Json
          id?: string
          menu_item_id: string
          name: string
          order_id: string
          quantity: number
          subtotal: number
          unit_price: number
        }
        Update: {
          customizations?: Json
          id?: string
          menu_item_id?: string
          name?: string
          order_id?: string
          quantity?: number
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          bcv_rate_snapshot: number | null
          created_at: string
          customer_id: string
          delivered_at: string | null
          delivery_floor: string
          delivery_store: string
          delivery_type: string
          discount_amount: number
          id: string
          notes: string | null
          order_number: number
          out_for_delivery_at: string | null
          payment_method: string | null
          restaurant_id: string
          runner_id: string | null
          status: string
          subtotal: number
          total: number
          total_bs: number | null
          updated_at: string
        }
        Insert: {
          bcv_rate_snapshot?: number | null
          created_at?: string
          customer_id: string
          delivered_at?: string | null
          delivery_floor?: string
          delivery_store?: string
          delivery_type?: string
          discount_amount?: number
          id?: string
          notes?: string | null
          order_number?: number
          out_for_delivery_at?: string | null
          payment_method?: string | null
          restaurant_id: string
          runner_id?: string | null
          status?: string
          subtotal: number
          total: number
          total_bs?: number | null
          updated_at?: string
        }
        Update: {
          bcv_rate_snapshot?: number | null
          created_at?: string
          customer_id?: string
          delivered_at?: string | null
          delivery_floor?: string
          delivery_store?: string
          delivery_type?: string
          discount_amount?: number
          id?: string
          notes?: string | null
          order_number?: number
          out_for_delivery_at?: string | null
          payment_method?: string | null
          restaurant_id?: string
          runner_id?: string | null
          status?: string
          subtotal?: number
          total?: number
          total_bs?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          kind: string
          notes: string | null
          paid_at: string | null
          period: string | null
          restaurant_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          kind: string
          notes?: string | null
          paid_at?: string | null
          period?: string | null
          restaurant_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          kind?: string
          notes?: string | null
          paid_at?: string | null
          period?: string | null
          restaurant_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_payments_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: string
          created_at: string
          customer_code: string | null
          email: string | null
          id: string
          is_employee: boolean
          local_number: string | null
          name: string
          phone: string | null
          promo_code: string | null
          store_floor: string | null
          store_id: string | null
          store_name: string | null
        }
        Insert: {
          account_type?: string
          created_at?: string
          customer_code?: string | null
          email?: string | null
          id: string
          is_employee?: boolean
          local_number?: string | null
          name?: string
          phone?: string | null
          promo_code?: string | null
          store_floor?: string | null
          store_id?: string | null
          store_name?: string | null
        }
        Update: {
          account_type?: string
          created_at?: string
          customer_code?: string | null
          email?: string | null
          id?: string
          is_employee?: boolean
          local_number?: string | null
          name?: string
          phone?: string | null
          promo_code?: string | null
          store_floor?: string | null
          store_id?: string | null
          store_name?: string | null
        }
        Relationships: []
      }
      ratings: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string | null
          order_id: string
          restaurant_id: string
          stars: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id?: string | null
          order_id: string
          restaurant_id: string
          stars: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string | null
          order_id?: string
          restaurant_id?: string
          stars?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          address: string | null
          created_at: string
          delivery_pickup: boolean
          delivery_to_store: boolean
          description: string | null
          hours: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          owner_id: string | null
          pago_movil_info: string
          payment_efectivo: boolean
          payment_en_caja: boolean
          payment_pago_movil: boolean
          payment_punto_entrega: boolean
          payment_whatsapp: boolean
          phone: string | null
          whatsapp_number: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          delivery_pickup?: boolean
          delivery_to_store?: boolean
          description?: string | null
          hours?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          owner_id?: string | null
          pago_movil_info?: string
          payment_efectivo?: boolean
          payment_en_caja?: boolean
          payment_pago_movil?: boolean
          payment_punto_entrega?: boolean
          payment_whatsapp?: boolean
          phone?: string | null
          whatsapp_number?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          delivery_pickup?: boolean
          delivery_to_store?: boolean
          description?: string | null
          hours?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          pago_movil_info?: string
          payment_efectivo?: boolean
          payment_en_caja?: boolean
          payment_pago_movil?: boolean
          payment_punto_entrega?: boolean
          payment_whatsapp?: boolean
          phone?: string | null
          whatsapp_number?: string
        }
        Relationships: []
      }
      runner_messages: {
        Row: {
          id: string
          is_broadcast: boolean
          message: string
          restaurant_id: string
          runner_id: string | null
          sent_at: string
          sent_by: string
        }
        Insert: {
          id?: string
          is_broadcast?: boolean
          message: string
          restaurant_id: string
          runner_id?: string | null
          sent_at?: string
          sent_by: string
        }
        Update: {
          id?: string
          is_broadcast?: boolean
          message?: string
          restaurant_id?: string
          runner_id?: string | null
          sent_at?: string
          sent_by?: string
        }
        Relationships: []
      }
      runner_shifts: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string
          id: string
          runner_id: string
          shift_date: string
          status: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          id?: string
          runner_id: string
          shift_date?: string
          status?: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          id?: string
          runner_id?: string
          shift_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "runner_shifts_runner_id_fkey"
            columns: ["runner_id"]
            isOneToOne: false
            referencedRelation: "food_runners"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_members: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          restaurant_id: string
          role: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          restaurant_id: string
          role: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          restaurant_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_members_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      menu_item_ratings_summary: {
        Row: {
          avg_stars: number | null
          menu_item_id: string | null
          rating_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ratings_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_ratings_summary: {
        Row: {
          avg_stars: number | null
          rating_count: number | null
          restaurant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ratings_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_employee_invite: { Args: { _token: string }; Returns: Json }
      avg_delivery_seconds_for_floor: {
        Args: { _floor: string; _restaurant_id: string }
        Returns: number
      }
      can_manage_menu_image: {
        Args: { _object_name: string }
        Returns: boolean
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_promo_code: { Args: never; Returns: string }
      get_current_bcv_rate: { Args: never; Returns: number }
      get_invitation_by_token: {
        Args: { _token: string }
        Returns: {
          email: string
          expires_at: string
          id: string
          restaurant_id: string
          restaurant_name: string
          staff_role: string
          store_floor: string
          store_name: string
          used_at: string
        }[]
      }
      import_menu_from_csv: {
        Args: { _items: Json; _restaurant_id: string }
        Returns: number
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      promote_user_to_admin_by_email: {
        Args: { _email: string }
        Returns: Json
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      revoke_admin_by_email: { Args: { _email: string }; Returns: Json }
      setup_account: {
        Args: {
          _account_type: string
          _business_description?: string
          _business_name?: string
          _business_phone?: string
          _staff_role?: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "worker"
        | "supervisor"
        | "restaurant_owner"
        | "admin"
        | "customer"
        | "manager"
        | "food_runner"
        | "developer"
      order_status:
        | "pending"
        | "confirmed"
        | "preparing"
        | "on_the_way"
        | "delivered"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "worker",
        "supervisor",
        "restaurant_owner",
        "admin",
        "customer",
        "manager",
        "food_runner",
        "developer",
      ],
      order_status: [
        "pending",
        "confirmed",
        "preparing",
        "on_the_way",
        "delivered",
      ],
    },
  },
} as const
