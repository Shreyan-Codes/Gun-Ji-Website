import { useSiteData } from "../context/SiteData.jsx";

const steps = [
  {
    num: "१",
    title: "Send your design",
    desc: "DM us the artwork, a screenshot, or even a rough idea.",
  },
  {
    num: "२",
    title: "We print it",
    desc: "Premium cotton tee in the colour of your choice.",
  },
  {
    num: "३",
    title: "You wear it",
    desc: "Fast, reliable delivery all across Nepal.",
  },
];

export default function Custom() {
  const { orderLink } = useSiteData();

  return (
    <section className="custom" id="custom">
      <div className="custom-inner">
        <div className="custom-text">
          <p className="eyebrow reveal">
            <span className="dev">कस्टम</span> · Your print
          </p>
          <h2 className="reveal">
            Designed by you.
            <br />
            Printed by us.
          </h2>
          <ol className="steps">
            {steps.map((step) => (
              <li className="reveal" key={step.num}>
                <span className="step-num dev" aria-hidden="true">{step.num}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
          <a
            className="btn btn-solid reveal"
            href={orderLink("Custom print — here's my idea:")}
            target="_blank"
            rel="noopener noreferrer"
          >
            Start a custom order <span className="arr" aria-hidden="true">↗</span>
          </a>
        </div>
        <figure className="custom-photo reveal">
          <img
            src="/assets/gunji_post_03.jpg"
            alt="Plain black GUN-JI tee worn in a café"
            loading="lazy"
          />
        </figure>
      </div>
    </section>
  );
}
