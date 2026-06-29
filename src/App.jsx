import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, AuthProvider } from './hooks/useAuth';
import Layout from './components/Layout/Layout';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import OutingDetailPage from './pages/OutingDetailPage';
import SkipperDashboard from './pages/SkipperDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminInboxPage from './pages/AdminInboxPage';
import CreateOutingPage from './pages/CreateOutingPage';
import BugReportPage from './pages/BugReportPage';
import BugReportThreadPage from './pages/BugReportThreadPage';
import MessagesPage from './pages/MessagesPage';
import DirectMessageThreadPage from './pages/DirectMessageThreadPage';
import MyOutingRequestsPage from './pages/MyOutingRequestsPage';
import FeatureRequestPage from './pages/FeatureRequestPage';
import FeatureRequestThreadPage from './pages/FeatureRequestThreadPage';
import ContactAdminPage from './pages/ContactAdminPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AnnouncementsFeed from './pages/AnnouncementsFeed';
import EmailConfirmedPage from './pages/EmailConfirmedPage';
import UserGuidePage from './pages/UserGuidePage';
import WaiverAcceptancePage from './pages/WaiverAcceptancePage';
import ClubEventChatPage from './pages/ClubEventChatPage';
import ClubEventsPage from './pages/ClubEventsPage';
import WelcomePage from './pages/WelcomePage';
import SignupForm from './components/Auth/SignupForm';
import LoginForm from './components/Auth/LoginForm';
import SignupSuccessPage from './pages/SignupSuccessPage';
import { hasAcceptedCurrentWaiver } from './utils/waiver';

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
  const { user, profile, loading } = useAuth();

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

  if (profile && !hasAcceptedCurrentWaiver(profile)) {
    return <WaiverAcceptancePage />;
  }

  return <Layout>{children}</Layout>;
}

function AuthRoute({ children, redirectAuthenticated = true }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh'}}>
        <Spinner />
      </div>
    );
  }

  if (user && redirectAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AdminRoute({ children }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <Layout>
        <Spinner />
      </Layout>
    );
  }

  if (!user || profile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  if (!hasAcceptedCurrentWaiver(profile)) {
    return <WaiverAcceptancePage />;
  }

  return <Layout>{children}</Layout>;
}

const isSignupConfirmationUrl = () => {
  if (typeof window === 'undefined') return false;

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return hashParams.get('type') === 'signup';
};

function HomeRoute() {
  const { user, profile, loading } = useAuth();

  if (isSignupConfirmationUrl()) {
    return <EmailConfirmedPage />;
  }

  if (loading) return <Spinner />;

  if (!user) {
    return <WelcomePage />;
  }

  if (profile && !hasAcceptedCurrentWaiver(profile)) {
    return <WaiverAcceptancePage />;
  }

  return <Layout><HomePage /></Layout>;
}

function App() {
  return (
    <AuthProvider>
      <Router basename="/Sailing">
        <Routes>
          <Route path="/signup" element={<AuthRoute redirectAuthenticated={false}><SignupForm /></AuthRoute>} />
          <Route path="/signup-success" element={<SignupSuccessPage />} />
          <Route path="/email-confirmed" element={<EmailConfirmedPage />} />
          <Route path="/login" element={<AuthRoute redirectAuthenticated={false}><LoginForm /></AuthRoute>} />
          <Route path="/welcome" element={<AuthRoute><WelcomePage /></AuthRoute>} />
          <Route path="/forgot-password" element={<AuthRoute><ForgotPasswordPage /></AuthRoute>} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/" element={<HomeRoute />} />
          <Route path="/community" element={<Navigate to="/" replace />} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/profile/:id" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
          <Route path="/messages/:memberId" element={<ProtectedRoute><DirectMessageThreadPage /></ProtectedRoute>} />
          <Route path="/my-outing-requests" element={<ProtectedRoute><MyOutingRequestsPage /></ProtectedRoute>} />
          <Route path="/outing/:id" element={<ProtectedRoute><OutingDetailPage /></ProtectedRoute>} />
          <Route path="/outing/:id/edit" element={<ProtectedRoute><CreateOutingPage /></ProtectedRoute>} />
          <Route path="/skipper-dashboard" element={<ProtectedRoute><SkipperDashboard /></ProtectedRoute>} />
          <Route path="/create-outing" element={<ProtectedRoute><CreateOutingPage /></ProtectedRoute>} />
          <Route path="/bug-report" element={<ProtectedRoute><BugReportPage /></ProtectedRoute>} />
          <Route path="/bug-report/:id" element={<ProtectedRoute><BugReportThreadPage /></ProtectedRoute>} />
          <Route path="/feature-request" element={<ProtectedRoute><FeatureRequestPage /></ProtectedRoute>} />
          <Route path="/feature-request/:id" element={<ProtectedRoute><FeatureRequestThreadPage /></ProtectedRoute>} />
          <Route path="/contact-admin" element={<ProtectedRoute><ContactAdminPage /></ProtectedRoute>} />
          <Route path="/guide" element={<ProtectedRoute><UserGuidePage /></ProtectedRoute>} />
          <Route path="/waiver" element={<ProtectedRoute><WaiverAcceptancePage /></ProtectedRoute>} />
          <Route path="/event-chat" element={<ProtectedRoute><ClubEventsPage /></ProtectedRoute>} />
          <Route path="/event-chat/:eventId" element={<ProtectedRoute><ClubEventChatPage /></ProtectedRoute>} />
          <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/inbox" element={<AdminRoute><AdminInboxPage /></AdminRoute>} />
          <Route path="/announcements" element={<ProtectedRoute><AnnouncementsFeed /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
