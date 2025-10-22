'use client';

import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationCenter } from '@/components/dashboard/NotificationCenter';
import { Link } from '@/i18n/routing';

interface DashboardSidebarProps {
  currentPage?: 'calendar' | 'insights' | 'settings' | 'services';
  onNotificationClick?: (appointmentId?: string) => void;
}

export function DashboardSidebar({ currentPage = 'calendar', onNotificationClick }: DashboardSidebarProps) {
  const t = useTranslations('dashboard');
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <>
      {/* MOBILE BOTTOM BAR - Only visible on mobile */}
      <MobileBottomBar currentPage={currentPage} />

      {/* DESKTOP SIDEBAR - Only visible on desktop */}
      <DesktopSidebar currentPage={currentPage} onNotificationClick={onNotificationClick} />
    </>
  );
}

// Mobile Bottom Bar Component
function MobileBottomBar({ currentPage }: { currentPage?: string }) {
  const t = useTranslations('dashboard');

  return (
    <nav className="sm:hidden fixed left-0 bottom-0 w-full h-16 bg-white border-t border-gray-200/60 z-50 flex items-center justify-around px-4">
      <Link
        href="/dashboard"
        className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all ${
          currentPage === 'calendar'
            ? 'text-gray-900 bg-gray-50'
            : 'text-gray-400'
        }`}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
        <span className="text-xs font-semibold">{t('navigation.calendar')}</span>
      </Link>

      <Link
        href="/dashboard/insights"
        className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all ${
          currentPage === 'insights'
            ? 'text-gray-900 bg-gray-50'
            : 'text-gray-400'
        }`}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
        <span className="text-xs font-semibold">{t('navigation.insights')}</span>
      </Link>

      <Link
        href="/dashboard/settings"
        className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all ${
          currentPage === 'settings'
            ? 'text-gray-900 bg-gray-50'
            : 'text-gray-400'
        }`}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="text-xs font-semibold">{t('navigation.settings')}</span>
      </Link>
    </nav>
  );
}

// Desktop Sidebar Component
function DesktopSidebar({ currentPage, onNotificationClick }: DashboardSidebarProps) {
  const t = useTranslations('dashboard');
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <aside className="max-sm:hidden fixed left-0 top-0 h-full w-20 bg-white border-r border-gray-200/60 flex flex-col items-center py-6 z-50">
      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-2 w-full px-3 pt-2">
        <Link
          href="/dashboard"
          className={`w-full h-14 flex items-center justify-center rounded-xl ${
            currentPage === 'calendar'
              ? 'bg-gray-50 text-gray-900'
              : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
          } transition-all relative group`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          <div className="absolute left-full ml-4 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap pointer-events-none">
            {t('navigation.calendar')}
          </div>
        </Link>

        <Link
          href="/dashboard/insights"
          className={`w-full h-14 flex items-center justify-center rounded-xl ${
            currentPage === 'insights'
              ? 'bg-gray-50 text-gray-900'
              : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
          } transition-all relative group`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          <div className="absolute left-full ml-4 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap pointer-events-none">
            {t('navigation.insights')}
          </div>
        </Link>

        <NotificationCenter
          onNotificationClick={onNotificationClick}
        />

        <Link
          href="/dashboard/settings"
          className={`w-full h-14 flex items-center justify-center rounded-xl ${
            currentPage === 'settings'
              ? 'bg-gray-50 text-gray-900'
              : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
          } transition-all relative group`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <div className="absolute left-full ml-4 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap pointer-events-none">
            {t('navigation.settings')}
          </div>
        </Link>

        <button className={`w-full h-14 flex items-center justify-center rounded-xl ${
          currentPage === 'services'
            ? 'bg-gray-50 text-gray-900'
            : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
        } transition-all relative group`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
          </svg>
          <div className="absolute left-full ml-4 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap">
            {t('navigation.services')}
          </div>
        </button>
      </nav>

      {/* Bottom Actions */}
      <div className="flex flex-col gap-2 w-full px-3">
        <Link
          href="/debug/api"
          className="w-full h-12 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-all relative group"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          <div className="absolute left-full ml-4 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap">
            {t('navigation.debug')}
          </div>
        </Link>

        {isAuthenticated && (
          <div className="relative group">
            <button className="w-full h-12 flex items-center justify-center">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-semibold">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
            </button>
            <div className="absolute left-full bottom-0 ml-4 w-72 bg-white rounded-2xl shadow-2xl border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              <div className="p-5 border-b border-gray-100">
                <p className="font-semibold text-gray-900">{user?.email}</p>
                {user?.role && <p className="text-sm text-gray-500 mt-1 capitalize">{user.role}</p>}
              </div>
              <div className="p-2">
                <button
                  onClick={logout}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-all"
                >
                  {t('navigation.signOut')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
