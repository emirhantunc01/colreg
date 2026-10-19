import BrandMark from "./BrandMark";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowDown, ArrowUpRight, Pause, Play } from "lucide-react";
import "./cinematic.css";
import HeroOcean from "./HeroOcean";
gsap.registerPlugin(ScrollTrigger);
export default function Cinematic({ onEnter }: { onEnter: () => void }) {
  const progress = useRef(0);
  const root = useRef<HTMLElement>(null),
    entering = useRef(false),
    transition = useRef<gsap.core.Timeline | null>(null);
  const [paused, setPaused] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [reduce, setReduce] = useState(paused);
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
    const mm = gsap.matchMedia();
    mm.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        const entrance = gsap.timeline({ defaults: { ease: "power3.out" } });
        entrance
          .from(".opening-line span", {
            yPercent: 110,
            duration: 1.3,
            stagger: 0.12,
            delay: 0.15,
          })
          .from(
            ".opening-description, .opening-action",
            { autoAlpha: 0, y: 20, duration: 0.9, stagger: 0.12 },
            "-.65",
          );
        gsap
          .timeline({
            scrollTrigger: {
              trigger: root.current,
              start: "top top",
              end: "bottom bottom",
              scrub: 0.65,
              invalidateOnRefresh: true,
            },
          })
          .to(progress, {current: 1, duration: 1, ease: "none"}, 0)
          .to(
            ".opening-copy",
            { y: -100, autoAlpha: 0, duration: 0.17, ease: "none" },
            0.02,
          )
          .fromTo(
            ".perspective-copy",
            { autoAlpha: 0, y: 55 },
            { autoAlpha: 1, y: 0, duration: 0.15, ease: "none" },
            0.23,
          )
          .to(
            ".perspective-copy",
            { autoAlpha: 0, y: -50, duration: 0.13, ease: "none" },
            0.55,
          )
          .fromTo(
            ".departure-copy",
            { autoAlpha: 0, y: 50 },
            { autoAlpha: 1, y: 0, duration: 0.17, ease: "none" },
            0.73,
          )
          .to(".scroll-cue", { autoAlpha: 0, duration: 0.08 }, 0)
          .to(
            ".journey-progress span",
            { scaleY: 1, transformOrigin: "top", ease: "none", duration: 1 },
            0,
          );
      },
      root,
    );
    mm.add("(prefers-reduced-motion: reduce)", () => {}, root);
    let alive = true;
    document.fonts.ready.then(() => {
      if (alive) ScrollTrigger.refresh();
    });
    return () => {
      alive = false;
      mm.revert();
      transition.current?.kill();
    };
  }, []);
  const enter = () => {
    if (entering.current) return;
    entering.current = true;
    if (reduce) {
      onEnter();
      return;
    }
    transition.current = gsap
      .timeline({ onComplete: onEnter })
      .to(root.current!.querySelector(".cinema-veil"), {
        autoAlpha: 1,
        duration: 0.5,
        ease: "power2.inOut",
      })
      .to(
        root.current!.querySelector(".cinema-content"),
        { scale: 0.98, autoAlpha: 0, duration: 0.45, ease: "power2.in" },
        0,
      );
  };
  return (
    <section
      className={`cinematic-intro ${reduce ? "motion-reduced" : ""}`}
      ref={root}
      aria-label="Introduction to COLREG 3D"
    >
      <div className="cinema-frame">
        <HeroOcean paused={paused || reduce} progress={progress} />
        <div className="cinema-shade" />
        <div className="cinema-content">
          <nav className="cinema-nav" aria-label="Introduction navigation">
            <a className="cinema-brand" href="./">
              <BrandMark />
              COLREG <span>3D</span>
            </a>
            <button onClick={enter}>
              Open studio <ArrowUpRight size={15} />
            </button>
          </nav>
          <div className="opening-copy">
            <p className="opening-context">
              A new perspective on maritime encounters.
            </p>
            <h1>
              <span className="opening-line">
                <span>See what</span>
              </span>
              <span className="opening-line">
                <span>comes next.</span>
              </span>
            </h1>
            <p className="opening-description">
              Step beyond the diagram.
              <br />
              Explore every encounter in three dimensions.
            </p>
            <button className="opening-action" onClick={enter}>
              Explore the encounters <ArrowUpRight size={18} />
            </button>
          </div>
          <div className="perspective-copy" aria-hidden="true">
            <span>One encounter.</span>
            <h2>
              A whole new
              <br />
              point of view.
            </h2>
            <p>
              Move from the overview to the bridge.
              <br />
              See the same moment from both sides.
            </p>
          </div>
          <div className="departure-copy">
            <h2>
              Understand
              <br />
              the movement.
            </h2>
            <p>Pause. Change perspective. Replay.</p>
            <button className="opening-action" onClick={enter}>
              Enter the studio <ArrowUpRight size={18} />
            </button>
            <small>
              Technical demonstrations. Source-based lessons coming after
              review.
            </small>
          </div>
          <div className="cinema-bottom">
            <span className="scroll-cue">
              <span className="scroll-line" />
              Scroll to explore <ArrowDown size={14} />
            </span>
            <button
              onClick={() => setPaused((p) => !p)}
              disabled={reduce}
              aria-label={
                paused || reduce
                  ? "Play ambient motion"
                  : "Pause ambient motion"
              }
            >
              {paused || reduce ? <Play size={13} /> : <Pause size={13} />}
              <span>{paused || reduce ? "Motion paused" : "Pause motion"}</span>
            </button>
          </div>
          <div className="journey-progress" aria-hidden="true">
            <span />
          </div>
        </div>
        <div className="cinema-veil" />
      </div>
    </section>
  );
}
