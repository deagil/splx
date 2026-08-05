import FeaturesSectionFive from "@/components/features-five";
import HeroHeader from "@/components/hero-section-two";
import ContentSection from "../content-three";
import FAQSection from "../faqs-section-three";
import FeaturesSection from "../features-six";
import Footer from "../footer-one";
import PricingSection from "../pricing-comparator-one";

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
