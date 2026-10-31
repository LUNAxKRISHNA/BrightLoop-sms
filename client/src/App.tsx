import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { PortalLayout } from './components/portal/portal-layout';
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
        {/* Landing and explore pages come from the landing work; until then, send everything to login. */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
