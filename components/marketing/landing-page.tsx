import Link from "next/link";
import { Button } from "@/components/ui/button";
import HeroHeader from "@/components/hero-section-two";
import ContentSection from "../content-three";
import FeaturesSection from "../features-six";
import FeaturesSectionFive from "@/components/features-five";
import Integrations from "../integrations-one";
import PricingSection from "../pricing-comparator-one";
import FAQSection from "../faqs-section-three";
import Footer from "../footer-one";

export default function MarketingPage() {
  return (
    <div className="flex min-h-screen flex-col">

    <HeroHeader />
    
    <ContentSection />
    <FeaturesSectionFive />
    <FeaturesSection />
    <PricingSection />
    <FAQSection />
    <Footer />

      {/* <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2024 Your App. All rights reserved.
        </div>
      </footer> */}
    </div>
  );
}

