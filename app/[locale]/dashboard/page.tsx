'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import { BusinessProvider, useBusiness } from '@/contexts/BusinessContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { CalendarSection } from '@/components/dashboard/CalendarSection';
import { CreateAppointmentModal } from '@/components/dashboard/CreateAppointmentModal';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { CalendarView } from '@/lib/calendar-utils';
import OnboardingTutorial from '@/components/dashboard/OnboardingTutorial';
import { useRouter } from '@/i18n/routing';

function DashboardContent() {
  const t = useTranslations('dashboard');
  const router = useRouter();
  
  // Initialize from URL params on mount, then use state
  const [view, setView] = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSwitchingBusiness, setIsSwitchingBusiness] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();
  const { businesses, selectedBusiness, selectedBusinessId, isLoading: businessLoading, selectBusiness } = useBusiness();

  // Increment refresh key when business changes to force calendar reload
  useEffect(() => {
    if (selectedBusinessId) {
      setIsSwitchingBusiness(true);
      setRefreshKey(prev => prev + 1);
      // Clear switching state after a brief moment
      const timer = setTimeout(() => setIsSwitchingBusiness(false), 300);
      return () => clearTimeout(timer);
    }
  }, [selectedBusinessId]);

  // Read URL params on mount to restore calendar state
  useEffect(() => {
    if (typeof window === 'undefined' || isInitialized) return;

    const params = new URLSearchParams(window.location.search);
    const urlView = params.get('view') as CalendarView | null;
    const urlDate = params.get('date');

    if (urlView && ['month', 'week', 'day', 'list'].includes(urlView)) {
      setView(urlView);
    }

    if (urlDate) {
      const parsedDate = new Date(urlDate);
      if (!isNaN(parsedDate.getTime())) {
        setCurrentDate(parsedDate);
      }
    }

    setIsInitialized(true);
  }, [isInitialized]);

  const businessName = selectedBusiness?.name || user?.email?.split('@')[0] || "My Business";

  return (
    <div className="min-h-screen bg-white">
      {/* Sidebar */}
      <DashboardSidebar
        currentPage="calendar"
        onNotificationClick={(appointmentId) => {
          if (appointmentId) {
            // TODO: Navigate to appointment or scroll to it in calendar
            console.log('Navigate to appointment:', appointmentId);
          }
        }}
        onNewAppointmentClick={() => setShowCreateModal(true)}
      />

      {/* Main Content - No left margin on mobile, ml-20 on desktop */}
      <main className="ml-0 sm:ml-20 min-h-screen pb-20 sm:pb-0">
        {/* Top Bar */}
        <DashboardHeader
          businesses={businesses}
          selectedBusinessId={selectedBusinessId}
          onBusinessChange={selectBusiness}
          businessLoading={businessLoading}
          businessName={businessName}
          isAuthenticated={isAuthenticated}
          onNewAppointmentClick={() => setShowCreateModal(true)}
        />

        {/* Calendar Content */}
        <CalendarSection
          view={view}
          currentDate={currentDate}
          onViewChange={setView}
          onDateChange={setCurrentDate}
          businessId={selectedBusinessId}
          refreshKey={refreshKey}
          isSwitchingBusiness={isSwitchingBusiness}
          selectedBusinessName={selectedBusiness?.name}
        />
      </main>

      {/* Modals */}
      <CreateAppointmentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setRefreshKey(prev => prev + 1);
        }}
        defaultDate={currentDate}
        businessId={selectedBusinessId}
      />
      <OnboardingTutorial />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute requireRole="owner">
      <BusinessProvider>
        <DashboardContent />
      </BusinessProvider>
    </ProtectedRoute>
  );
}
