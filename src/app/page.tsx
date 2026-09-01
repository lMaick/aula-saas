import type { Metadata } from "next";

import { BenefitsSection } from "@/features/landing/benefits-section";
import { FaqSection } from "@/features/landing/faq-section";
import { HeroSection } from "@/features/landing/hero-section";
import { HowItWorksSection } from "@/features/landing/how-it-works-section";
import { LandingFooter } from "@/features/landing/landing-footer";
import { LandingHeader } from "@/features/landing/landing-header";
import { ProblemsSection } from "@/features/landing/problems-section";
import { ProductShowcaseSection } from "@/features/landing/product-showcase-section";
import { TrialSection } from "@/features/landing/trial-section";

export const metadata: Metadata = {
  title: "Aula SaaS | Gestão simples para professores particulares",
  description: "Organize alunos, aulas, pagamentos, pacotes e reposições em um só lugar.",
};

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#fbfaf7] text-slate-950">
      <LandingHeader />
      <main>
        <HeroSection />
        <ProblemsSection />
        <BenefitsSection />
        <HowItWorksSection />
        <ProductShowcaseSection />
        <TrialSection />
        <FaqSection />
      </main>
      <LandingFooter />
    </div>
  );
}
