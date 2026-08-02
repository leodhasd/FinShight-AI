import React from 'react';
import Navbar from '../../components/Navbar/Navbar.jsx';
import HeroSection from '../../components/HeroSection/HeroSection.jsx';
import FeaturesSection from '../../components/FeaturesSection/FeaturesSection.jsx';
import AIInsightsPreview from '../../components/AIInsightsPreview/AIInsightsPreview.jsx';
import SecuritySection from '../../components/SecuritySection/SecuritySection.jsx';
import HowItWorks from '../../components/HowItWorks/HowItWorks.jsx';
import Testimonials from '../../components/Testimonials/Testimonials.jsx';
import FAQ from '../../components/FAQ/FAQ.jsx';
import Footer from '../../components/Footer/Footer.jsx';

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <AIInsightsPreview />
        <SecuritySection />
        <HowItWorks />
        <Testimonials />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
