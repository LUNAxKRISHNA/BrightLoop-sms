import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AdminLayout } from './components/admin/admin-layout';
import { PortalLayout } from './components/portal/portal-layout';
import { DashboardPage } from './pages/admin/dashboard-page';
import { StaffPage } from './pages/admin/staff-page';
import { InvoiceDetailPage as AdminInvoiceDetailPage } from './pages/admin/billing/invoice-detail-page';
import { InvoicesPage as AdminInvoicesPage } from './pages/admin/billing/invoices-page';
import { PaymentsPage } from './pages/admin/billing/payments-page';
import { DiscountsPage } from './pages/admin/catalog/discounts-page';
import { PlansPage } from './pages/admin/catalog/plans-page';
import { ProductsPage } from './pages/admin/catalog/products-page';
import { TaxesPage } from './pages/admin/catalog/taxes-page';
import { CustomersPage } from './pages/admin/sales/customers-page';
import { SubscriptionDetailPage as AdminSubscriptionDetailPage } from './pages/admin/sales/subscription-detail-page';
import { SubscriptionsPage as AdminSubscriptionsPage } from './pages/admin/sales/subscriptions-page';
import { TemplatesPage } from './pages/admin/sales/templates-page';
import { ForgotPasswordPage } from './pages/forgot-password-page';
import { LoginPage } from './pages/login-page';
import { InvoiceDetailPage } from './pages/portal/invoice-detail-page';
import { InvoicesPage } from './pages/portal/invoices-page';
import { OverviewPage } from './pages/portal/overview-page';
import { ProfilePage } from './pages/portal/profile-page';
import { SubscriptionDetailPage } from './pages/portal/subscription-detail-page';
import { SubscriptionsPage } from './pages/portal/subscriptions-page';
import { SignupPage } from './pages/signup-page';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/portal" element={<PortalLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="subscriptions" element={<SubscriptionsPage />} />
          <Route path="subscriptions/:id" element={<SubscriptionDetailPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="invoices/:id" element={<InvoiceDetailPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/portal" replace />} />
        </Route>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="staff" element={<StaffPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="subscriptions" element={<AdminSubscriptionsPage />} />
          <Route path="subscriptions/:id" element={<AdminSubscriptionDetailPage />} />
          <Route path="templates" element={<TemplatesPage />} />
          <Route path="invoices" element={<AdminInvoicesPage />} />
          <Route path="invoices/:id" element={<AdminInvoiceDetailPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="plans" element={<PlansPage />} />
          <Route path="taxes" element={<TaxesPage />} />
          <Route path="discounts" element={<DiscountsPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
        {/* Landing and explore pages come from the landing work; until then, send everything to login. */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
