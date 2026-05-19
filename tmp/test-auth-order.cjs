const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY;
if (!url || !serviceKey || !anonKey) throw new Error('Missing Supabase env vars');

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const email = `checkout-test-${Date.now()}@example.com`;
const password = `Test-${Math.random().toString(36).slice(2)}!A9`;
const restaurantId = 'a0000000-0000-0000-0000-000000000001';

(async () => {
  const { data: userData, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: 'Checkout Test User', account_type: 'customer' },
  });
  if (createError) throw createError;
  const userId = userData.user.id;

  await new Promise((resolve) => setTimeout(resolve, 800));

  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;

  const { data: rateData, error: rateError } = await client
    .from('bcv_rates')
    .select('rate, date')
    .order('date', { ascending: false })
    .limit(1)
    .single();
  if (rateError) throw rateError;

  const bcvRateSnapshot = Number(rateData?.rate ?? 517.96);
  const orderData = {
    customer_id: userId,
    restaurant_id: restaurantId,
    subtotal: 1,
    discount_amount: 0,
    total: 1.5,
    delivery_store: 'Prueba QA',
    delivery_floor: '1',
    notes: 'Orden de prueba para verificar INSERT autenticado',
    status: 'pending',
    payment_method: 'en_caja',
    delivery_type: 'to_store',
    bcv_rate_snapshot: bcvRateSnapshot,
    total_bs: Number((1.5 * bcvRateSnapshot).toFixed(2)),
  };

  const { data: order, error: orderError } = await client
    .from('orders')
    .insert({ ...orderData })
    .select()
    .single();

  if (orderError) {
    console.error('ORDER INSERT FAILED:', JSON.stringify(orderError));
    console.log('ALERT_MESSAGE=' + 'Error guardando orden: ' + orderError.message + ' Code: ' + orderError.code);
    process.exit(2);
  }

  console.log('ORDER SAVED:', order.id, 'to Supabase project fgqoixfbnivyctduubwz');
  console.log('TEST_ORDER_ID=' + order.id);
  console.log('ALERT_MESSAGE=none');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
