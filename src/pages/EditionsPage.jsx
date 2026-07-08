import PageHero from "../components/PageHero.jsx";
import Editions from "../components/Editions.jsx";
import CtaBand from "../components/CtaBand.jsx";

export default function EditionsPage() {
  return (
    <>
      <PageHero
        eyebrowDev="संग्रह"
        eyebrow="The editions"
        title="Four ways to wear it"
        intro="Every GUN-जी tee belongs to an edition — pick the world you rep. Football icons, anime back prints, Devanagari with attitude, or a print that's entirely yours."
        meta="Premium oversized fit · Black, bone & brown"
      />
      <Editions bare />
      <CtaBand
        titleDev="सूची"
        title="— see every tee on the rack."
        to="/tees"
        label="Browse the catalog"
      />
    </>
  );
}
