import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { LocalAuthProvider, useLocalAuth } from '@/lib/LocalAuthContext';

// Pages
import AuthPage from './pages/AuthPage';
import GamePortal from './pages/GamePortal';
import StudySession from './pages/StudySession';
import QuestionBank from './pages/QuestionBank';
import Dashboard from './pages/Dashboard';
import UserProfile from './pages/UserProfile';
import Leaderboard from './pages/Leaderboard';
import Forum from './pages/Forum';
import ChallengePage from './pages/ChallengePage';
import StudyRoom from './pages/StudyRoom';

const AppContent = () => {
  const { localUser, loading, login } = useLocalAuth();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-950">
        <div className="w-8 h-8 border-4 border-gray-700 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!localUser) {
    return <AuthPage onAuth={login} />;
  }

  return (
    <Routes>
      <Route path="/" element={<GamePortal />} />
      <Route path="/study" element={<StudySession />} />
      <Route path="/bank" element={<QuestionBank />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/profile" element={<UserProfile />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="/forum" element={<Forum />} />
      <Route path="/challenge" element={<ChallengePage />} />
      <Route path="/studyroom" element={<StudyRoom />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <LocalAuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AppContent />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </LocalAuthProvider>
  )
}

export default App
