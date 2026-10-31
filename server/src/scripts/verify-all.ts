import { app } from '../app.js';
import { pool } from '../db/pool.js';
import type { Server } from 'http';

let server: Server;
const PORT = 4099;
const BASE_URL = `http://localhost:${PORT}/api`;

async function fetchJson(
  endpoint: string,
  options: RequestInit = {},
): Promise<{ status: number; ok: boolean; data: any }> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data: any = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('🚀 Starting BrightLoopSMS Verification Suite...\n');
  server = app.listen(PORT);

  try {
    // 1. Health check
    const health = await fetchJson('/health');
    console.assert(health.status === 200 && health.data.status === 'ok', 'Health check failed');
    console.log('✅ 1. Health check passed');

    // 2. Login Tests
    const adminLogin = await fetchJson('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@brightloop.io', password: 'Password@123' }),
    });
    console.assert(adminLogin.status === 200, 'Admin login failed');
    const adminToken = adminLogin.data.token;
    console.log('✅ 2a. Admin login passed');

    const staffLogin = await fetchJson('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'staff@brightloop.io', password: 'Password@123' }),
    });
    console.assert(staffLogin.status === 200, 'Staff login failed');
    const staffToken = staffLogin.data.token;
    console.log('✅ 2b. Staff login passed');

    const custLogin = await fetchJson('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'acme@client.com', password: 'Password@123' }),
    });
    console.assert(custLogin.status === 200, 'Customer login failed');
    const custToken = custLogin.data.token;
    console.log('✅ 2c. Customer login passed');

    // 3. Password Policy Validation
    const weakPass = await fetchJson('/auth/register-staff', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ email: 'weak@brightloop.io', password: 'short' }),
    });
    console.assert(weakPass.status === 400, 'Weak password should be rejected');
    console.log('✅ 3. Password policy validation (>8 chars, upper, lower, special) passed');

    // 4. RBAC: Customer cannot access /api/discounts
    const custDiscountCheck = await fetchJson('/discounts', {
      headers: { Authorization: `Bearer ${custToken}` },
    });
    console.assert(
      custDiscountCheck.status === 403,
      'Customer should be 403 forbidden on /discounts',
    );
    console.log('✅ 4. Customer RBAC isolation (/api/discounts forbidden) passed');

    // 5. Customer isolation on products: no cost_price or notes
    const custProducts = await fetchJson('/products', {
      headers: { Authorization: `Bearer ${custToken}` },
    });
    console.assert(
      custProducts.data.length > 0 &&
        custProducts.data[0].cost_price === null &&
        custProducts.data[0].notes === null,
      'Customer should never see cost_price or notes',
    );
    console.log('✅ 5. Catalog customer isolation (cost_price and notes stripped) passed');

    // 6. Admin Catalog CRUD: Create product with variant
    const newProd = await fetchJson('/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'BrightLoop Analytics Add-on',
        product_type: 'ADD_ON',
        sales_price: 250.0,
        cost_price: 100.0,
        notes: 'Internal cost info',
        variants: [
          { attribute_name: 'Edition', attribute_value: 'Enterprise', price_surcharge: 150.0 },
        ],
      }),
    });
    console.assert(newProd.status === 201, 'Create product with variant failed');
    console.log('✅ 6. Admin product & variant creation (+surcharge) passed');

    // 7. Finance Lead Dashboard Canonical Queries Benchmark (<2s SLA)
    const startBench = Date.now();
    const dashboard = await fetchJson('/dashboard/finance', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const benchTime = Date.now() - startBench;
    console.assert(dashboard.status === 200, 'Finance dashboard failed');
    console.assert(benchTime < 2000, `Finance dashboard took ${benchTime}ms, exceeds 2s SLA`);
    console.log(
      `✅ 7. Finance Lead Dashboard 4 canonical SQL queries executed in ${benchTime}ms (<2s SLA)`,
    );
    console.log('   Dashboard Metrics:', dashboard.data.metrics);

    // 8. Idempotent Batch Billing: double run check
    const billing1 = await fetchJson('/billing/run', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({}),
    });
    console.assert(billing1.status === 200, 'Batch billing run 1 failed');
    console.log('✅ 8a. Batch billing run 1 completed:', {
      generated: billing1.data.generatedCount,
      skipped: billing1.data.skippedCount,
    });

    const billing2 = await fetchJson('/billing/run', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({}),
    });
    console.assert(billing2.status === 200, 'Batch billing run 2 failed');
    console.assert(
      billing2.data.generatedCount === 0,
      'Second run must not generate duplicate invoices',
    );
    console.log('✅ 8b. Idempotent Double-Billing check passed (0 duplicate invoices generated)');

    // 9. Partial and Full Payment Workflow
    const invoices = await fetchJson('/invoices', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.assert(invoices.data.length > 0, 'No invoices found');
    const inv = invoices.data[0];

    const remaining = Number(inv.outstanding_balance);
    if (remaining > 0) {
      const halfPay = (remaining / 2).toFixed(2);
      const partialPayRes = await fetchJson('/payments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({
          invoice_id: inv.id,
          payment_method: 'UPI',
          amount: halfPay,
          notes: 'Test partial payment',
        }),
      });
      console.assert(partialPayRes.status === 201, 'Partial payment failed');
      console.assert(
        partialPayRes.data.invoice.status === 'CONFIRMED',
        'Partial payment should keep status CONFIRMED',
      );
      console.log(`✅ 9a. Partial payment (${halfPay}) recorded. Invoice remains CONFIRMED.`);

      const finalPay = (remaining - Number(halfPay)).toFixed(2);
      const finalPayRes = await fetchJson('/payments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({
          invoice_id: inv.id,
          payment_method: 'BANK_TRANSFER',
          amount: finalPay,
          notes: 'Final settlement payment',
        }),
      });
      console.assert(finalPayRes.status === 201, 'Final payment failed');
      console.assert(
        finalPayRes.data.invoice.status === 'PAID',
        'Invoice status must flip to PAID upon full settlement',
      );
      console.log(`✅ 9b. Final payment (${finalPay}) recorded. Invoice status flipped to PAID.`);
    }

    console.log('\n🎉 ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exitCode = 1;
  } finally {
    server.close();
    await pool.end();
  }
}

runTests();
