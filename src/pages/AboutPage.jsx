import PageHero from "../components/PageHero.jsx";
import Brand from "../components/Brand.jsx";
import CtaBand from "../components/CtaBand.jsx";

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrowDev="बारेमा"
        eyebrow="The brand"
        title="Small label. Loud tees."
        intro={
          <>
            Born in Kathmandu, printed in Kathmandu. GUN-<span className="dev">जी</span>{" "}
            exists because a good tee shouldn't need a middleman — just a DM.
          </>
        }
        meta={
          <>
            <span className="dev">काठमाडौं</span>
            <span>KTM · Nepal</span>
          </>
        }
      />

      <section className="about-photos">
        <figure className="about-photo reveal">
          <div className="arch">
            <img src="/assets/gunji_post_02.jpg" alt="USE दिमाग tee on a Kathmandu street" loading="lazy" />
          </div>
          <figcaption>
            <span>On the street — Ason, KTM</span>
            <span className="dev">००१</span>
          </figcaption>
        </figure>
        <figure className="about-photo reveal">
          <div className="arch">
            <img src="/assets/gunji_post_03.jpg" alt="Plain black GUN-जी tee in a Kathmandu café" loading="lazy" />
          </div>
          <figcaption>
            <span>Everyday fit — essentials</span>
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
