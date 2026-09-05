import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LocationProvider } from '@/context/LocationContext';
import { ToastProvider } from '@/components/Toast';
import { AppShell } from '@/components/AppShell';
import { Landing } from '@/screens/Landing';
import { AuthScreen } from '@/screens/auth/AuthScreen';
import { ListingScreen } from '@/screens/ListingScreen';
import { StatementDetail } from '@/screens/StatementDetail';
import { CreateStatement } from '@/screens/CreateStatement';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { SearchScreen } from '@/screens/SearchScreen';
import { NotificationsScreen } from '@/screens/NotificationsScreen';
import { AdminDashboard } from '@/screens/AdminDashboard';
import { InfoPage } from '@/screens/InfoPage';
import { useRoute, matchRoute } from '@/lib/router';

function Router() {
  const { path, navigate } = useRoute();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50 dark:bg-ink-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-brand-500 dark:border-ink-800" />
      </div>
    );
  }

  // Auth routes (no shell)
  if (path === '/login') return <AuthScreen mode="login" navigate={navigate} />;
  if (path === '/signup') return <AuthScreen mode="signup" navigate={navigate} />;

  // Landing for unauthenticated visitors
  if (!user && path === '/') return <Landing navigate={navigate} />;
  if (!user && path !== '/' && !path.startsWith('/page/')) {
    return <AuthScreen mode="login" navigate={navigate} />;
  }

  // Route matching
  const statementMatch = matchRoute(path, '/statement/:id');
  const profileMatch = matchRoute(path, '/profile/:yevoxId');
  const pageMatch = matchRoute(path, '/page/:slug');

  return (
    <AppShell path={path} navigate={navigate}>
      {path === '/' && <ListingScreen view="live" navigate={navigate} />}
      {path === '/turbo' && <ListingScreen view="turbo" navigate={navigate} />}
      {path === '/trending' && <ListingScreen view="trending" navigate={navigate} />}
      {path === '/archive' && <ListingScreen view="archive" navigate={navigate} />}
      {path === '/search' && <SearchScreen navigate={navigate} />}
      {path === '/notifications' && <NotificationsScreen navigate={navigate} />}
      {path === '/create' && <CreateStatement navigate={navigate} />}
      {path === '/settings' && <SettingsScreen navigate={navigate} />}
      {path === '/admin' && <AdminDashboard navigate={navigate} />}
      {statementMatch && <StatementDetail id={statementMatch.id} navigate={navigate} />}
      {profileMatch && <ProfileScreen yevoxId={profileMatch.yevoxId} navigate={navigate} />}
      {pageMatch && <InfoPage slug={pageMatch.slug} navigate={navigate} />}
      {/* Fallback */}
      {!statementMatch && !profileMatch && !pageMatch &&
        path !== '/' && path !== '/turbo' && path !== '/trending' &&
        path !== '/archive' && path !== '/search' && path !== '/notifications' &&
        path !== '/create' && path !== '/settings' && path !== '/admin' && (
        <div className="card mx-auto max-w-md p-8 text-center">
          <p className="text-sm text-ink-400">Page not found.</p>
          <button onClick={() => navigate('/')} className="btn-secondary mt-4">Home</button>
        </div>
      )}
    </AppShell>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LocationProvider>
          <ToastProvider>
            <Router />
          </ToastProvider>
        </LocationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
