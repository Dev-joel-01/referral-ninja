import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  Briefcase,
  Users,
  Wallet,
  Settings,
  LogOut,
  Shield,
  Menu,
  FileText,        // ← added for Mafullu
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface SidebarProps {
  className?: string;
}

const userNavItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/profile', label: 'Profile', icon: User },
  { path: '/tasks', label: 'Task Zone', icon: Briefcase },
  { path: '/referrals', label: 'Referrals', icon: Users },
  { path: '/payments', label: 'Payments', icon: Wallet },
  { path: '/mafullu', label: 'Mafullu', icon: FileText },   // ← new item
  { path: '/settings', label: 'Settings', icon: Settings },
];

const adminNavItems = [
  { path: '/admin', label: 'Admin Dashboard', icon: Shield },
  { path: '/admin/tasks', label: 'Task Manager', icon: Briefcase },
  { path: '/admin/users', label: 'User Manager', icon: Users },
  { path: '/admin/payments', label: 'Payment Manager', icon: Wallet },
  { path: '/admin/mafullu', label: 'Mafullu Manager', icon: Briefcase },
];

export function Sidebar({ className }: SidebarProps) {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const isAdminRoute = location.pathname.startsWith('/admin');

  const getNavItems = () => {
    if (isAdminRoute && isAdmin) {
      // On admin routes, show admin navigation + a link back to user area
      return [
        ...adminNavItems,
        { path: '/dashboard', label: 'Back to User Area', icon: LayoutDashboard }
      ];
    } else {
      // On user routes, show user navigation + admin link if user is admin
      const items = [...userNavItems];
      if (isAdmin) {
        items.push({ path: '/admin', label: 'Admin Panel', icon: Shield });
      }
      return items;
    }
  };

  const navItems = getNavItems();

  const handleLogout = async () => {
    await logout();
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-ninja-green/10">
        <NavLink to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ninja-green/20 flex items-center justify-center border border-ninja-green/30">
            <span className="text-ninja-green font-heading font-bold text-xl">N</span>
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-semibold text-ninja-mint text-lg leading-tight">
              Referral Ninja
            </span>
            <span className="text-xs text-ninja-sage font-mono">
              {isAdmin && isAdminRoute ? 'ADMIN PANEL' : 'MEMBER AREA'}
            </span>
          </div>
        </NavLink>
      </div>

      {/* User Info */}
      {user && !isAdminRoute && (
        <div className="p-4 border-b border-ninja-green/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-ninja-green/20 flex items-center justify-center border border-ninja-green/30 overflow-hidden">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-6 h-6 text-ninja-green" />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-medium text-ninja-mint truncate">{user.legal_name}</span>
              <span className="text-xs text-ninja-sage truncate">@{user.username}</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300',
                isActive
                  ? 'text-ninja-green bg-ninja-green/10 border border-ninja-green/30'
                  : 'text-ninja-sage hover:text-ninja-mint hover:bg-ninja-green/10'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive && 'text-ninja-green')} />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-ninja-green/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-ninja-sage hover:text-red-400 hover:bg-red-500/10 transition-all duration-300 w-full"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Log Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col w-72 bg-ninja-dark/50 backdrop-blur-xl border-r border-ninja-green/10 h-screen sticky top-0',
          className
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label="Open navigation menu"
            className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-ninja-dark/80 border border-ninja-green/20 text-ninja-mint"
          >
            <Menu className="w-6 h-6" />
          </button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-72 p-0 bg-ninja-dark/95 backdrop-blur-xl border-r border-ninja-green/10"
        >
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  );
}