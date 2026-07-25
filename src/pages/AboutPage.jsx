import PageHero from "../components/PageHero.jsx";
import Hero from "../components/Hero.jsx";
import Ticker from "../components/Ticker.jsx";
import Brand from "../components/Brand.jsx";
import CtaBand from "../components/CtaBand.jsx";
import { usePageMeta } from "../lib/seo.js";

export default function AboutPage() {
  usePageMeta({
    title: "About — Small Label, Loud Tees",
    description:
      "GUN-जी is a Nepal-based t-shirt label offering premium tees at affordable prices, with delivery all across Nepal.",
    path: "/about",
  });
  return (
    <>
      <PageHero
        eyebrowDev="बारेमा"
        eyebrow="The brand"
        title="Small label. Loud tees."
        intro={
          <>
            Made for Nepal. GUN-<span className="dev">जी</span>{" "}
            exists because a good tee shouldn't need a middleman — just a DM.
          </>
        }
        meta={
          <>
            <span>Delivery across Nepal</span>
          </>
        }
      />

      <Ticker />
      <Hero />

      <section className="about-photos">
        <figure className="about-photo reveal">
          <div className="arch">
            <img src="/assets/gunji_duo_wide.jpg" alt="GUN-जी logo tees in white and black, laid side by side" loading="lazy" />
          </div>
          <figcaption>
            <span>Normal fit — both colourways</span>
            <span className="dev">००१</span>
          </figcaption>
        </figure>
        <figure className="about-photo reveal">
          <div className="arch">
            <img src="/assets/gunji_post_03.jpg" alt="Plain black GUN-जी tee in a café" loading="lazy" />
          </div>
          <figcaption>
            <span>Premium everyday fit</span>
            <span className="dev">००२</span>
          </figcaption>
        </figure>
      </section>

      <Brand bare />

      <CtaBand
        titleDev="जोडिनुहोस् —"
        title="every drop lands on Instagram first."
        href="https://www.instagram.com/gunji.clo1/"
        label="Follow @gunji.clo1"
      />
    </>
  );
}
