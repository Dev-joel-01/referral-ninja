import { BrowserRouter as Router, Routes, Route,  } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { CursorGlow } from '@/components/layout/CursorGlow';
import { Sidebar } from '@/components/layout/Sidebar';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { DemoModeBanner } from '@/components/common/DemoModeBanner';
import { PWAInstallPrompt } from '@/components/common/PWAInstallPrompt';

// Public Pages
import LandingPage from '@/pages/LandingPage';

// Auth Pages
import { SignupPage } from '@/pages/SignupPage';
import { LoginPage } from '@/pages/LoginPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';

// User Pages
import { DashboardPage } from '@/pages/DashboardPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { TaskZonePage } from '@/pages/TaskZonePage';
import { ReferralsPage } from '@/pages/ReferralsPage';
import { PaymentsPage } from '@/pages/PaymentsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { MafulluPage } from '@/pages/MafulluPage';

// Admin Pages
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { TaskManager } from '@/pages/admin/TaskManager';
import { UserManager } from '@/pages/admin/UserManager';
import { PaymentManager } from '@/pages/admin/PaymentManager';
import { MafulluManager } from '@/pages/admin/MafulluManager';

// Layout for authenticated pages
function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ninja-black">
      <DemoModeBanner />
      <CursorGlow />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-4 lg:p-8 lg:ml-0 min-h-screen pt-16">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// Layout for public pages (no sidebar, no cursor glow)
function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#050B06]">
      <main className="min-h-screen">
        {children}
      </main>
    </div>
  );
}

function App() {
  return (
    <>
      <Router>
        <Routes>
          {/* Public Landing Page */}
          <Route 
            path="/" 
            element={
              <PublicLayout>
                <LandingPage />
              </PublicLayout>
            } 
          />

          {/* Public Auth Routes - WRAPPED IN PublicLayout */}
          <Route 
            path="/signup" 
            element={
              <PublicLayout>
                <SignupPage />
              </PublicLayout>
            } 
          />
          <Route 
            path="/login" 
            element={
              <PublicLayout>
                <LoginPage />
              </PublicLayout>
            } 
          />
          <Route 
            path="/forgot-password" 
            element={
              <PublicLayout>
                <ForgotPasswordPage />
              </PublicLayout>
            } 
          />
          
          {/* Protected User Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <DashboardPage />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <ProfilePage />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <TaskZonePage />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/referrals"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <ReferralsPage />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/payments"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <PaymentsPage />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <SettingsPage />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/mafullu"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <MafulluPage />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />

          {/* Protected Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <AuthenticatedLayout>
                  <AdminDashboard />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/tasks"
            element={
              <ProtectedRoute requireAdmin>
                <AuthenticatedLayout>
                  <TaskManager />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute requireAdmin>
                <AuthenticatedLayout>
                  <UserManager />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/payments"
            element={
              <ProtectedRoute requireAdmin>
                <AuthenticatedLayout>
                  <PaymentManager />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/mafullu"
            element={
              <ProtectedRoute requireAdmin>
                <AuthenticatedLayout>
                  <MafulluManager />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />

          {/* 404 - Show Not Found Page Instead of Auto-Redirect */}
          <Route 
            path="*" 
            element={
              <PublicLayout>
                <div className="min-h-screen flex flex-col items-center justify-center text-ninja-mint p-4">
                  <h1 className="text-4xl font-bold mb-4">404</h1>
                  <p className="text-ninja-sage mb-6">Page not found</p>
                  <a 
                    href="/" 
                    className="text-ninja-green hover:underline"
                  >
                    Go back home
                  </a>
                </div>
              </PublicLayout>
            } 
          />
        </Routes>
      </Router>
      <PWAInstallPrompt />
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#0A1A0D',
            border: '1px solid rgba(57, 255, 20, 0.2)',
            color: '#E8FFE8',
          },
        }}
      />
    </>
  );
}

export default App;