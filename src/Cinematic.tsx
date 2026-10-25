import BrandMark from "./BrandMark";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowDown, ArrowUpRight, Pause, Play } from "lucide-react";
import "./cinematic.css";
import HeroOcean from "./HeroOcean";
import { HEAD_ON_SCENARIO_ID } from "./introStory";

gsap.registerPlugin(ScrollTrigger);

type Props = { onEnter: (scenarioId?: string, time?: number) => void };

const chapters = [
  {
    className: "opening-copy",
    title: "Read the encounter.",
    body: "An English-language COLREG learning tool. This Rule 14 example assumes two power-driven vessels in sight on reciprocal courses.",
    note: "Illustrative tracks and timing · Rule 14 head-on situation",
  },
  {
    className: "perspective-copy",
    title: "Both turn to starboard.",
    body: "In this illustrative scene, each vessel alters course to starboard. The geometry and timing are teaching choices, not a trigger distance.",
    note: "Authored manoeuvre begins at 36 s",
  },
  {
    className: "departure-copy",
    title: "Study the manoeuvre.",
    body: "Follow both tracks until the vessels are past and clear, then explore the rule and its assumptions in the studio.",
    note: "41 rules · 4 annexes · 36 learning scenes + 2 technical demos",
  },
];

export default function Cinematic({ onEnter }: Props) {
  const progress = useRef({ current: 0 });
  const root = useRef<HTMLElement>(null);
  const entering = useRef(false);
  const transition = useRef<gsap.core.Timeline | null>(null);
  const media = useRef<gsap.MatchMedia | null>(null);
  const [reduce, setReduce] = useState(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [paused, setPaused] = useState(reduce);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReduce(query.matches);
      if (query.matches) setPaused(true);
    };
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const section = root.current;
    if (!section || reduce) return;
    progress.current.current = 0;
    const mm = gsap.matchMedia();
    media.current = mm;
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const opening = section.querySelector(".opening-copy");
      const perspective = section.querySelector(".perspective-copy");
      const departure = section.querySelector(".departure-copy");
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.45,
          invalidateOnRefresh: true,
        },
      });
      timeline
        .to(progress.current, { current: 1, duration: 1, ease: "none" }, 0)
        .to(opening, { autoAlpha: 0, y: -14, duration: 0.075, ease: "none" }, 0.225)
        .fromTo(perspective, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.075, ease: "none" }, 0.315)
        .to(perspective, { autoAlpha: 0, y: -12, duration: 0.075, ease: "none" }, 0.625)
        .fromTo(departure, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.08, ease: "none" }, 0.72)
        .to(section.querySelector(".scroll-cue"), { autoAlpha: 0, duration: 0.08 }, 0.1);
    }, section);
    let alive = true;
    document.fonts.ready.then(() => {
      if (alive) ScrollTrigger.refresh();
    });
    return () => {
      alive = false;
      mm.revert();
      if (media.current === mm) media.current = null;
      transition.current?.kill();
    };
  }, [reduce]);

  const enter = () => {
    if (entering.current) return;
    entering.current = true;
    media.current?.revert();
    media.current = null;
    const complete = () => onEnter(HEAD_ON_SCENARIO_ID, 0);
    if (reduce) {
      complete();
      return;
    }
    const frame = root.current?.querySelector(".cinema-content");
    const veil = root.current?.querySelector(".cinema-veil");
    if (!frame || !veil) {
      complete();
      return;
    }
    transition.current = gsap.timeline({ onComplete: complete })
      .to(veil, { autoAlpha: 1, duration: 0.38, ease: "power2.inOut" })
      .to(frame, { scale: 0.99, autoAlpha: 0, duration: 0.38, ease: "power2.in" }, 0);
  };

  return (
    <section className={`cinematic-intro${reduce ? " motion-reduced" : ""}`} ref={root} aria-label="Rule 14 head-on encounter">
      <div className="cinema-frame">
        <HeroOcean paused={paused || reduce} progress={progress.current} />
        <div className="cinema-shade" />
        <div className="cinema-content">
          <nav className="cinema-nav" aria-label="Introduction navigation">
            <a className="cinema-brand" href="./"><BrandMark /> COLREG <span>3D</span></a>
            <button className="cinema-enter" onClick={enter}>Open studio <ArrowUpRight size={16} /></button>
          </nav>

          <div className="story-overlays" aria-live="polite">
            {chapters.map((chapter, index) => {
              const Heading = index === 0 ? "h1" : "h2";
              return <article className={`chapter-copy ${chapter.className}`} key={chapter.className}>
                <Heading>{chapter.title}</Heading>
                <p>{chapter.body}</p>
                <small>{chapter.note}</small>
                {index === 2 && <button className="opening-action" onClick={enter}>Open the encounter <ArrowUpRight size={17} /></button>}
              </article>;
            })}
          </div>

          <div className="cinema-bottom">
            <span className="scroll-cue"><span className="scroll-line" />Scroll to follow the encounter <ArrowDown size={14} /></span>
            <button className="motion-toggle" onClick={() => setPaused((value) => !value)} disabled={reduce} aria-label={paused ? "Play sea motion" : "Pause sea motion"}>
              {paused ? <Play size={13} /> : <Pause size={13} />}<span>{paused ? "Motion paused" : "Pause motion"}</span>
            </button>
          </div>
        </div>
        <div className="cinema-veil" />
      </div>
      {reduce && <div className="reduced-chapters">
        {chapters.map((chapter, index) => {
          const Heading = index === 0 ? "h1" : "h2";
          return <article key={chapter.className}>
            <small>{chapter.note}</small>
            <Heading>{chapter.title}</Heading>
            <p>{chapter.body}</p>
            {index === 2 && <button className="opening-action" onClick={enter}>Open the encounter <ArrowUpRight size={17} /></button>}
          </article>;
        })}
      </div>}
    </section>
  );
}
