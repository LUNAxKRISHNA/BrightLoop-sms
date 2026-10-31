import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { ForgotPasswordPage } from './pages/forgot-password-page';
import { LoginPage } from './pages/login-page';
import { SignupPage } from './pages/signup-page';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        {/* Landing and explore pages come from the landing work; until then, send everything to login. */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
