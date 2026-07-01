import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import Landing from './pages/Landing';
import SignIn from './pages/SignIn';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Study from './pages/Study';
import Questions from './pages/Questions';
import Duels from './pages/Duels';
import Tournaments from './pages/Tournaments';
import Elaboration from './pages/Elaboration';
import Analytics from './pages/Analytics';
import Rankings from './pages/Rankings';
import ImportQuestions from './pages/ImportQuestions';
import AIGenerate from './pages/AIGenerate';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Search from './pages/Search';
import StudyRooms from './pages/StudyRooms';
import Willie from './pages/Willie';
import AdminUsers from './pages/AdminUsers';
import Wellbeing from './pages/Wellbeing';
import Suggestions from './pages/Suggestions';
import CalendarModule from './pages/CalendarModule';

import Library from './pages/Library';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/landing" element={<Landing />} />
      <Route path="/sign-in" element={<SignIn />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/landing" replace />} />}>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/study" element={<Study />} />
          <Route path="/questions" element={<Questions />} />
          <Route path="/duels" element={<Duels />} />
          <Route path="/tournaments" element={<Tournaments />} />
          <Route path="/elaboration" element={<Elaboration />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/rankings" element={<Rankings />} />
          <Route path="/import" element={<ImportQuestions />} />
          <Route path="/ai-generate" element={<AIGenerate />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/search" element={<Search />} />
          <Route path="/study-rooms" element={<StudyRooms />} />
          <Route path="/willie" element={<Willie />} />
          <Route path="/admin-users" element={<AdminUsers />} />
          <Route path="/wellbeing" element={<Wellbeing />} />
          <Route path="/calendar" element={<CalendarModule />} />

          <Route path="/library" element={<Library />} />
          <Route path="/suggestions" element={<Suggestions />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
