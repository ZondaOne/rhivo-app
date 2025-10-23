'use client';

import { HeroSection } from '@/components/HeroSection';
import { HowItWorksSection } from '@/components/HowItWorksSection';
import { UseCasesSection } from '@/components/UseCasesSection';
import { ForBusinessSection } from '@/components/ForBusinessSection';
import { HomeFooter } from '@/components/HomeFooter';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Logo } from '@/components/Logo';

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Language Switcher - Fixed position */}
      <div className="fixed top-6 right-6 sm:top-8 sm:right-8 z-50">
        <LanguageSwitcher />
      </div>

      {/* Logo - Fixed position top left */}
      <div className="fixed top-6 left-6 sm:top-8 sm:left-8 z-50">
        <Logo size="sm" />
      </div>

      {/* Hero Section */}
      <HeroSection />

      {/* How It Works Section */}
      <HowItWorksSection />

      {/* Use Cases Section - Real-life images */}
      <UseCasesSection />

      {/* For Business Owners Section */}
      <ForBusinessSection />

      {/* Footer */}
      <HomeFooter />
    </main>
  );
}
