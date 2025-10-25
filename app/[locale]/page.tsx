'use client';

import { HeroSection } from '@/components/HeroSection';
import { HowItWorksSection } from '@/components/HowItWorksSection';
import { UseCasesSection } from '@/components/UseCasesSection';
import { ForBusinessSection } from '@/components/ForBusinessSection';
import { HomeFooter } from '@/components/HomeFooter';
import { LandingHeader } from '@/components/LandingHeader';

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* New Header/Navbar - Following style guide */}
      <LandingHeader />

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
