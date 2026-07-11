import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// ─── Project data ─────────────────────────────────────────────────────────────
const worksData = [
  {
    num: '01',
    tag: 'Luxury Restaurant Website',
    title: 'LUXE Restaurant',
    desc: 'Immersive restaurant website with elegant motion, interactive menu, and premium booking experience.',
    tech: 'Next.js · Three.js · GSAP',
    link: '#',
    bg: 'linear-gradient(135deg, #aa3bff 0%, #070708 100%)'
  },
  {
    num: '02',
    tag: 'Architect Portfolio',
    title: 'Nova Studio',
    desc: 'Elegant portfolio for an architecture studio featuring immersive layouts, custom transitions, and premium typography.',
    tech: 'React · WebGL · Tailwind CSS',
    link: '#',
    bg: 'linear-gradient(135deg, #0071e3 0%, #070708 100%)'
  },
  {
    num: '03',
    tag: 'Startup Landing Page',
    title: 'Elevate SaaS',
    desc: 'High-converting landing page designed to communicate product value with clean UI, motion graphics, and optimised performance.',
    tech: 'Next.js · Framer Motion · Tailwind CSS',
    link: '#',
    bg: 'linear-gradient(135deg, #ff3b30 0%, #070708 100%)'
  },
  {
    num: '04',
    tag: 'E-Commerce Experience',
    title: 'Atlas Commerce',
    desc: 'Modern shopping experience focused on speed, accessibility, intuitive navigation, and seamless checkout.',
    tech: 'React · Node.js · MongoDB',
    link: '#',
    bg: 'linear-gradient(135deg, #34c759 0%, #070708 100%)'
  },
  {
    num: '05',
    tag: 'Interactive Developer Portfolio',
    title: 'Codefolio',
    desc: 'Immersive portfolio combining WebGL, smooth scrolling, custom cursor interactions, and cinematic transitions.',
    tech: 'Three.js · GSAP · WebGL',
    link: '#',
    bg: 'linear-gradient(135deg, #ff9500 0%, #070708 100%)'
  },
  {
    num: '06',
    tag: 'Business Website',
    title: 'Horizon Consulting',
    desc: 'Fast, scalable business website designed to establish credibility, generate leads, and provide an exceptional user experience.',
    tech: 'React · SEO · Node.js',
    link: '#',
    bg: 'linear-gradient(135deg, #00c7be 0%, #070708 100%)'
  }
];

// ─── Left-panel DOM helpers ────────────────────────────────────────────────────
function setActiveCard(index) {
  const w = worksData[index];
  if (!w) return;

  const tagEl    = document.getElementById('worksActiveTag');
  const titleEl  = document.getElementById('worksActiveTitle');
  const descEl   = document.getElementById('worksActiveDesc');
  const techEl   = document.getElementById('worksActiveTech');
  const curEl    = document.getElementById('worksCounterCurrent');
  const infoEl   = document.getElementById('worksActiveInfo');

  if (!infoEl) return;

  // Crossfade: fade out → swap text → fade in
  gsap.to(infoEl, {
    opacity: 0,
    y: -10,
    duration: 0.2,
    ease: 'power2.in',
    onComplete: () => {
      if (tagEl)   tagEl.textContent   = '(' + w.num + ') — ' + w.tag;
      if (titleEl) titleEl.textContent = w.title;
      if (descEl)  descEl.textContent  = w.desc;
      if (techEl)  techEl.textContent  = w.tech;
      if (curEl)   curEl.textContent   = w.num;

      gsap.fromTo(infoEl,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }
      );
    }
  });
}

function showCounter() {
  const el = document.getElementById('worksCounter');
  if (el) gsap.to(el, { opacity: 1, duration: 0.4, ease: 'power2.out' });
}

function hideLeftInfo() {
  const infoEl    = document.getElementById('worksActiveInfo');
  const counterEl = document.getElementById('worksCounter');
  if (infoEl)    gsap.set(infoEl, { opacity: 0, y: 0 });
  if (counterEl) gsap.set(counterEl, { opacity: 0 });
}


// ─── WorksStack component ──────────────────────────────────────────────────────
const WorksStack = () => {
  const wrapperRef = useRef(null);

  useEffect(() => {
    // Reset left-panel slots to hidden on mount
    hideLeftInfo();

    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const cards = gsap.utils.toArray('.work-card-anim');
    const total = cards.length;

    // ── Initial state: all cards hidden below viewport centre ──
    gsap.set(cards, {
      y: 190,
      scale: 0.95,
      opacity: 0,
      transformOrigin: 'center center',
      willChange: 'transform, opacity',
      backfaceVisibility: 'hidden',
      force3D: true
    });

    // ── One timeline, one ScrollTrigger ───────────────────────
    const REVEAL_DUR  = 1.8;
    const PAUSE_DUR   = 0.4;
    const INTRO_DUR   = 1.0;
    const INTRO_PAUSE = 0.5;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#works',
        start: 'top top',
        end: '+=' + (total + 2) * 100 + '%',
        pin: true,
        scrub: true,
        anticipatePin: 1,
        invalidateOnRefresh: true
      }
    });

    // ── Phase 0: fade out scroll instruction ──────────────────
    tl.to('.works-scroll-instruction', {
      opacity: 0,
      y: -25,
      duration: INTRO_DUR,
      ease: 'power2.inOut'
    });

    tl.to({}, { duration: INTRO_PAUSE });

    // ── Phases 1…N: reveal each card progressively ────────────
    cards.forEach((card, i) => {

      if (i > 0) {
        tl.to({}, { duration: PAUSE_DUR });
      }

      // Update left panel when this card starts entering
      tl.call(() => {
        setActiveCard(i);
        if (i === 0) showCounter();
      });

      // Slide the new card up to centre
      tl.to(card, {
        y: 0,
        scale: 1,
        opacity: 1,
        duration: REVEAL_DUR,
        ease: 'power2.out',
        force3D: true
      });

      // Compress all previous cards simultaneously
      if (i > 0) {
        for (let j = 0; j < i; j++) {
          const depthFromTop = i - j;
          tl.to(cards[j], {
            y: -depthFromTop * 22,
            scale: 1 - depthFromTop * 0.04,
            duration: REVEAL_DUR,
            ease: 'power2.out',
            force3D: true
          }, '<');
        }
      }
    });

    ScrollTrigger.refresh();

    return () => {
      ScrollTrigger.getAll().forEach(st => {
        if (st.vars && st.vars.trigger === '#works') st.kill();
      });
      tl.kill();
    };
  }, []);

  return (
    <div className="works-stack-wrapper" ref={wrapperRef}>
      <div className="works-scroll-instruction">
        <div className="works-scroll-pulsing-wrapper">
          <div className="works-scroll-icon"></div>
          <span className="works-scroll-text">Scroll to explore</span>
        </div>
      </div>

      {worksData.map((w, i) => (
        <div key={i} className="work-card-anim">
          <div className="work-card" style={{ background: w.bg }}>
            <div className="work-card-content">
              <span className="work-card-number">({w.num}) — {w.tag}</span>
              <h3 className="work-card-title">{w.title}</h3>
              <p className="work-card-desc">{w.desc}</p>
              <div className="work-card-tech">{w.tech}</div>
              <a href={w.link} className="work-card-button">View Tech Stack</a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Mount ────────────────────────────────────────────────────────────────────
const container = document.getElementById('worksStackContainer');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <WorksStack />
    </React.StrictMode>
  );
}
