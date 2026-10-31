import cors from 'cors';
import express from 'express';
import { authRouter } from './routes/auth.routes.js';
import { taxesRouter } from './routes/taxes.routes.js';
import { productsRouter } from './routes/products.routes.js';
import { plansRouter } from './routes/plans.routes.js';
import { discountsRouter } from './routes/discounts.routes.js';
import { customersRouter } from './routes/customers.routes.js';
import { quotationTemplatesRouter } from './routes/quotation-templates.routes.js';
import { subscriptionsRouter } from './routes/subscriptions.routes.js';
import { billingRouter } from './routes/billing.routes.js';
import { invoicesRouter } from './routes/invoices.routes.js';
import { paymentsRouter } from './routes/payments.routes.js';
import { dashboardRouter } from './routes/dashboard.routes.js';

export const app = express();

app.use(cors());
app.use(express.json());

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/taxes', taxesRouter);
app.use('/api/products', productsRouter);
app.use('/api/plans', plansRouter);
app.use('/api/discounts', discountsRouter);
app.use('/api/customers', customersRouter);
app.use('/api/quotation-templates', quotationTemplatesRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/billing', billingRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/dashboard', dashboardRouter);
