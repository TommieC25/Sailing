import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout/Layout';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import CommunityPage from './pages/CommunityPage';
import OutingDetailPage from './pages/OutingDetailPage';
import SkipperDashboard from './pages/SkipperDashboard';
import CreateOutingPage from './pages/CreateOutingPage';
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

function App() {
  return (
    <Router basename="/Sailing">
      <Routes>
        <Route path="/signup" element={<AuthRoute><SignupForm /></AuthRoute>} />
        <Route path="/login" element={<AuthRoute><LoginForm /></AuthRoute>} />
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/community" element={<ProtectedRoute><CommunityPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/profile/:id" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/outing/:id" element={<ProtectedRoute><OutingDetailPage /></ProtectedRoute>} />
        <Route path="/skipper-dashboard" element={<ProtectedRoute><SkipperDashboard /></ProtectedRoute>} />
        <Route path="/create-outing" element={<ProtectedRoute><CreateOutingPage /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
