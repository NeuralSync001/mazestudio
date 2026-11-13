import {
  BookingSection,
  CollectionsSection,
  ServicesSection,
} from "../components/HomeSections";
import { HeroSection } from "../components/HeroSection";

export function HomePage() {
  return (
    <main>
      <HeroSection />
      <ServicesSection />
      <BookingSection />
      <CollectionsSection />
    </main>
  );
}
