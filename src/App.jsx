import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

// Importy stránek přímo, aby to bylo spolehlivější
import GroundMap from './pages/GroundMap';
import ManageGround from './pages/ManageGround';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  
  const isLoginPage = window.location.pathname.toLowerCase() === '/login';

  if (isLoadingPublicSettings || isLoadingAuth) {
    return <div className="flex h-screen items-center justify-center">Načítám aplikaci...</div>;
  }

  if (authError && !isLoginPage) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }

  return (
    <Routes>
      <Route path="/" element={<LayoutWrapper currentPageName={mainPageKey}><MainPage /></LayoutWrapper>} />
      
      {/* TADY JSOU TY DŮLEŽITÉ OPRAVY PRO MAPU A SPRÁVU */}
      <Route path="/map/:id" element={<LayoutWrapper currentPageName="GroundMap"><GroundMap /></LayoutWrapper>} />
      <Route path="/manage/:id" element={<LayoutWrapper currentPageName="ManageGround"><ManageGround /></LayoutWrapper>} />

      {/* Zbytek stránek */}
      {Object.entries(Pages).map(([path, Page]) => (
        <Route key={path} path={`/${path}`} element={<LayoutWrapper currentPageName={path}><Page /></LayoutWrapper>} />
      ))}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App