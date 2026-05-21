import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth, AuthProvider } from './hooks/useAuth';
import { supabase } from './utils/supabaseClient';
import Layout from './components/Layout/Layout';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import CommunityPage from './pages/CommunityPage';
import OutingDetailPage from './pages/OutingDetailPage';
import SkipperDashboard from './pages/SkipperDashboard';
import AdminDashboard from './pages/AdminDashboard';
import CreateOutingPage from './pages/CreateOutingPage';
import BugReportPage from './pages/BugReportPage';
import FeatureRequestPage from './pages/FeatureRequestPage';
import ContactAdminPage from './pages/ContactAdminPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AnnouncementsFeed from './pages/AnnouncementsFeed';
import SignupForm from './components/Auth/SignupForm';
import LoginForm from './components/Auth/LoginForm';

const Spinner = () => (
  <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '48px'}}>
    <div style={{
      width: '40px', height: '40px', borderRadius: '50%',
      border: '4px solid #e2e8f0', borderTopColor: '#0369a1',
      animation: 'spin 0.8s linear infinite'
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Layout>
        <Spinner />
      </Layout>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
}

function AuthRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh'}}>
        <Spinner />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(null);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('admins')
          .select('id')
          .eq('user_id', user.id)
          .single();

        setIsAdmin(!error && !!data);
      } catch {
        setIsAdmin(false);
      }
    };

    checkAdmin();
  }, [user]);

  if (loading || isAdmin === null) {
    return (
      <Layout>
        <Spinner />
      </Layout>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Layout>{children}</Layout>;
}

function App() {
  return (
    <AuthProvider>
      <Router basename="/Sailing">
        <Routes>
          <Route path="/signup" element={<AuthRoute><SignupForm /></AuthRoute>} />
          <Route path="/login" element={<AuthRoute><LoginForm /></AuthRoute>} />
          <Route path="/forgot-password" element={<AuthRoute><ForgotPasswordPage /></AuthRoute>} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/community" element={<ProtectedRoute><CommunityPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/profile/:id" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/outing/:id" element={<ProtectedRoute><OutingDetailPage /></ProtectedRoute>} />
          <Route path="/skipper-dashboard" element={<ProtectedRoute><SkipperDashboard /></ProtectedRoute>} />
          <Route path="/create-outing" element={<ProtectedRoute><CreateOutingPage /></ProtectedRoute>} />
          <Route path="/bug-report" element={<ProtectedRoute><BugReportPage /></ProtectedRoute>} />
          <Route path="/feature-request" element={<ProtectedRoute><FeatureRequestPage /></ProtectedRoute>} />
          <Route path="/contact-admin" element={<ProtectedRoute><ContactAdminPage /></ProtectedRoute>} />
<Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/announcements" element={<ProtectedRoute><AnnouncementsFeed /></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
