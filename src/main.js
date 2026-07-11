import { FluidMaskReveal } from './fluid-mask.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { CircularGalleryApp } from './circular-gallery.js';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);


document.addEventListener('DOMContentLoaded', () => {

  // --- 1. INITIALIZE WEBGL FLUID REVEAL CANVAS ---
  const canvasContainer = document.getElementById('canvasContainer');

  // layer_2.webp (Top layer: bold/white bg)
  // layer_1.webp (Bottom layer: fluffy/black bg)
  const baseImg = '/layer_2.webp';
  const revealImg = '/layer_1.webp';

  new FluidMaskReveal(canvasContainer, baseImg, revealImg, {
    simResolution: 256,
    dyeResolution: 512,
    velocityDissipation: 0.985,
    dyeDissipation: 0.995,
    splatRadius: 0.0018,
    splatForce: 6000,
    revealSize: 5.5,
    edgeSoftness: 0.15,
    edgeWidth: 0.35
  });

  // --- 2. STARTUP LOADING SCREEN ANIMATION ---
  const loader = document.getElementById('loader');
  const loaderPercent = document.getElementById('loaderPercent');
  const loaderPath = document.querySelector('.loader-path');

  if (loader && loaderPath && loaderPercent) {
    // Get SVG path length dynamically for the drawing outline effect
    const pathLength = loaderPath.getTotalLength();

    // Initialize outline offset
    loaderPath.style.strokeDasharray = pathLength;
    loaderPath.style.strokeDashoffset = pathLength;

    const bLoad = document.querySelector('.b-load');
    const aposLoad = document.querySelector('.apos-load');
    const loaderImgW = document.querySelector('.loader-img-w');
    const loaderImages = document.querySelectorAll('.loader-img');
    let imageInterval;

    if (aposLoad) {
      gsap.set(aposLoad, { scale: 0, transformOrigin: 'center center' });
    }

    const loaderTl = gsap.timeline();

    if (aposLoad) {
      loaderTl.to(aposLoad, {
        scale: 1,
        rotation: 15,
        duration: 0.8,
        ease: 'back.out(1.2)'
      }, 0.2);
    }

    if (loaderImgW && loaderImages.length > 0) {
      // Expand the image container width
      const targetWidth = window.innerWidth > 991 ? '20rem' : '10rem';
      loaderTl.fromTo(loaderImgW, { width: '1rem' }, {
        width: targetWidth,
        duration: 0.8,
        ease: 'power4.inOut'
      }, 0);

      // Start cycling images
      let currentIdx = 0;

      // Initially show first image
      gsap.set(loaderImages[0], { opacity: 1, scale: 1 });

      imageInterval = setInterval(() => {
        const nextIdx = (currentIdx + 1) % loaderImages.length;

        // Fade current out
        gsap.to(loaderImages[currentIdx], {
          opacity: 0,
          scale: 0.6,
          duration: 0.15,
          ease: 'power2.inOut'
        });

        // Fade next in
        gsap.fromTo(loaderImages[nextIdx],
          { opacity: 0, scale: 0.6, rotation: -15 },
          { opacity: 1, scale: 1, rotation: 0, duration: 0.25, ease: 'back.out(1.2)' }
        );

        currentIdx = nextIdx;
      }, 300);

      // Scale down last active image and clean up interval on loader completion
      loaderTl.eventCallback('onComplete', () => {
        clearInterval(imageInterval);

        if (bLoad) {
          gsap.to(bLoad, { yPercent: 100, opacity: 0, duration: 0.4, ease: 'power3.in' });
        }
        if (aposLoad) {
          gsap.to(aposLoad, { scale: 0, opacity: 0, duration: 0.4, ease: 'power3.in' });
        }

        gsap.to(loaderImages, {
          scale: 0,
          opacity: 0,
          duration: 0.3,
          ease: 'power2.inOut',
          onComplete: () => {
            // Slide loader up and hide
            gsap.to(loader, {
              yPercent: -100,
              duration: 0.5,
              ease: 'power4.inOut',
              onComplete: () => {
                loader.style.display = 'none';
              }
            });
          }
        });
      });
    } else {
      // Standard completion logic if no images
      loaderTl.eventCallback('onComplete', () => {
        if (bLoad) {
          gsap.to(bLoad, { yPercent: 100, opacity: 0, duration: 0.4, ease: 'power3.in' });
        }
        if (aposLoad) {
          gsap.to(aposLoad, { scale: 0, opacity: 0, duration: 0.4, ease: 'power3.in' });
        }
        gsap.to(loader, {
          yPercent: -100,
          duration: 0.5,
          ease: 'power4.inOut',
          onComplete: () => {
            loader.style.display = 'none';
          }
        });
      });
    }

    // Animate percentage count (padded to 3 digits)
    const countObj = { val: 0 };
    loaderTl.to(countObj, {
      val: 100,
      duration: 2.2,
      ease: 'power2.out',
      onUpdate: () => {
        const padded = String(Math.floor(countObj.val)).padStart(3, '0');
        loaderPercent.textContent = padded;
      }
    }, 0);

    // Animate drawing outline of the "B" SVG path
    loaderTl.to(loaderPath, {
      strokeDashoffset: 0,
      duration: 2.2,
      ease: 'power2.out'
    }, 0);

    // Fill in letter color at the end
    loaderTl.to(loaderPath, {
      fill: '#ffffff',
      stroke: 'transparent',
      duration: 0.2,
      ease: 'power1.out'
    }, '-=0.25');
  }

  // --- 3. SELECTED WORKS HOVER CURSOR TRAIL ---
  const workLinks = document.querySelectorAll('.work-link');
  workLinks.forEach(link => {
    const customCursor = link.querySelector('.cursor-work');
    if (!customCursor) return;

    gsap.set(customCursor, {
      xPercent: -50,
      yPercent: -50,
      scale: 0,
      autoAlpha: 0
    });

    const state = { tx: 0, ty: 0, cx: 0, cy: 0, active: false, raf: null };
    const easeFactor = 0.12;

    function updateCursorPosition() {
      state.cx += (state.tx - state.cx) * easeFactor;
      state.cy += (state.ty - state.cy) * easeFactor;

      gsap.set(customCursor, { x: state.cx, y: state.cy });

      if (state.active || Math.abs(state.cx - state.tx) > 0.05 || Math.abs(state.cy - state.ty) > 0.05) {
        state.raf = requestAnimationFrame(updateCursorPosition);
      } else {
        state.raf = null;
      }
    }

    link.addEventListener('mouseenter', () => {
      state.active = true;
      gsap.to(customCursor, {
        scale: 1,
        autoAlpha: 1,
        duration: 0.5,
        ease: 'back.out(1.7)',
        overwrite: 'auto'
      });
      if (!state.raf) {
        state.raf = requestAnimationFrame(updateCursorPosition);
      }
    });

    link.addEventListener('mousemove', (e) => {
      const bounds = link.getBoundingClientRect();
      state.tx = e.clientX - bounds.left;
      state.ty = e.clientY - bounds.top;

      if (!state.active) {
        state.cx = state.tx;
        state.cy = state.ty;
        gsap.set(customCursor, { x: state.cx, y: state.cy });
      }

      if (!state.raf) {
        state.raf = requestAnimationFrame(updateCursorPosition);
      }
    });

    link.addEventListener('mouseleave', () => {
      state.active = false;
      gsap.to(customCursor, {
        scale: 0,
        autoAlpha: 0,
        duration: 0.3,
        ease: 'power3.in',
        overwrite: 'auto'
      });
    });
  });

  // --- 3.5. EXPANDABLE LOGO ANIMATION (BHUSHAN' Text Style) ---
  const logoWrap = document.getElementById('navLogoWrap');
  const logoSvg = document.getElementById('navLogo');

  if (logoWrap && logoSvg) {
    const slidingLetters = logoSvg.querySelectorAll('.nav-letter-g text');
    const apostrophe = logoSvg.querySelector('.nav-apos');

    const collapsedWidth = 72;
    const expandedWidth = 385;
    const collapsedAposX = 50;
    const collapsedLetterY = 80;

    // Set initial coordinates
    gsap.set(apostrophe, { x: collapsedAposX });
    slidingLetters.forEach(lettr => {
      gsap.set(lettr, { y: collapsedLetterY });
    });

    let logoTimeline = null;

    function expandLogo() {
      if (logoTimeline) logoTimeline.kill();
      logoTimeline = gsap.timeline();

      const svgObj = { w: collapsedWidth };

      logoTimeline.to(svgObj, {
        w: expandedWidth,
        duration: 0.75,
        ease: 'power4.inOut',
        onUpdate: () => {
          logoSvg.setAttribute('viewBox', `0 0 ${svgObj.w} 80`);
        }
      }, 0);

      logoTimeline.to(apostrophe, {
        x: 364,
        duration: 0.75,
        ease: 'power4.inOut'
      }, 0);

      logoTimeline.to(slidingLetters, {
        y: 0,
        duration: 0.65,
        stagger: 0.05,
        ease: 'power3.out'
      }, 0.15);
    }

    function collapseLogo() {
      if (logoTimeline) logoTimeline.kill();
      logoTimeline = gsap.timeline();

      const svgObj = { w: expandedWidth };

      logoTimeline.to(svgObj, {
        w: collapsedWidth,
        duration: 0.7,
        ease: 'power4.inOut',
        onUpdate: () => {
          logoSvg.setAttribute('viewBox', `0 0 ${svgObj.w} 80`);
        }
      }, 0.2);

      logoTimeline.to(apostrophe, {
        x: collapsedAposX,
        duration: 0.7,
        ease: 'power4.inOut'
      }, 0.2);

      logoTimeline.to(Array.from(slidingLetters).reverse(), {
        y: collapsedLetterY,
        duration: 0.6,
        stagger: 0.04,
        ease: 'power3.in'
      }, 0);
    }

    logoWrap.addEventListener('mouseenter', expandLogo);
    logoWrap.addEventListener('mouseleave', collapseLogo);
  }

  // --- 3.6. PROFILE SECTION ANIMATIONS ---
  const profileSection = document.getElementById('studio');
  const profileCard = document.getElementById('profileGraphicCard');
  const profileWrap = document.getElementById('profileGraphicWrap');

  if (profileSection && profileWrap && profileCard) {


    // 2. Initialize OGL Circular Gallery
    const galleryItems = [
      { image: '/circularGrid/570734071_18073123133333791_2656245530876947204_n.webp', text: '01' },
      { image: '/circularGrid/571253755_18073123091333791_7179021897149196008_n.webp', text: '02' },
      { image: '/circularGrid/571279871_18073123103333791_9201497937627262912_n.webp', text: '03' },
      { image: '/circularGrid/571351230_18073123148333791_1640271566709002015_n.webp', text: '04' },
      { image: '/circularGrid/571554745_18073123115333791_7680717514533464023_n.webp', text: '05' },
      { image: '/circularGrid/571750161_18073123058333791_3829552886527474970_n.webp', text: '06' },
      { image: '/circularGrid/571975553_18073123079333791_3823788734555170550_n.webp', text: '07' },
      { image: '/circularGrid/575307368_17903935863291569_208189049925128467_n.webp', text: '08' },
      { image: '/circularGrid/575759062_17903935749291569_6039472367733797092_n.webp', text: '09' },
      { image: '/circularGrid/576074871_17903935842291569_2018784139041245819_n.webp', text: '10' }
    ];

    const galleryWrap = document.getElementById('circularGalleryWrap');
    const galleryContainer = document.getElementById('circularGalleryContainer');
    let galleryApp = null;

    if (galleryWrap) {
      galleryApp = new CircularGalleryApp(galleryWrap, {
        items: galleryItems,
        bend: 2.4, // C-Shape vertical curve multiplier
        borderRadius: 0.05,
        isScrollControlled: true
      });
    }

    // 3. ScrollTrigger Entrance Animation for left text columns
    gsap.fromTo('.profile-left > *',
      {
        opacity: 0,
        y: 40
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: profileSection,
          start: 'top 70%',
          toggleActions: 'play none none none'
        }
      }
    );

    // 4. Pin Profile Section & Swap Heart for Circular Gallery on Scroll/Swipe
    const profileTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: profileSection,
        start: 'top top',
        end: '+=8000', // Scroll amount pinned (increased to allow a long scroll showing all images)
        scrub: true,
        pin: true,
        anticipatePin: 1
      }
    });

    // Step A: Scroll down indicator fades out quickly as user scrolls a little bit
    profileTimeline.to(profileWrap, {
      autoAlpha: 0,
      scale: 0.8,
      y: -60,
      duration: 0.05,
      ease: 'power1.inOut'
    });

    // Step B: Circular Gallery slides up and fades in quickly to be available
    profileTimeline.to(galleryContainer, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.15,
      ease: 'power2.out',
      onStart: () => {
        galleryContainer.classList.add('active');
        if (galleryApp) {
          galleryApp.onResize();
        }
      },
      onReverseComplete: () => {
        galleryContainer.classList.remove('active');
      }
    }, 0.02);

    // Step C: Scrub the OGL circular gallery rotation throughout the rest of the scroll (long lasting)
    if (galleryApp) {
      profileTimeline.to(galleryApp.scroll, {
        target: 80.0, // Rotates the C-shape wheel more to display all images
        duration: 0.95,
        ease: 'none'
      }, 0.05);
    }
  }

  // --- 4. NAVBAR SCROLL EFFECT ---
  const header = document.querySelector('.nav-header');
  if (header) {
    const handleScroll = () => {
      if (window.scrollY > 0) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initialize on page load
  }

  // --- 5. GOOEY NAV EFFECT ---
  const container = document.getElementById('gooeyNavContainer');
  const navList = document.getElementById('navList');
  const filterRef = document.getElementById('gooeyFilter');
  const textRef = document.getElementById('gooeyText');

  if (container && navList && filterRef && textRef) {
    const navItems = navList.querySelectorAll('.nav-item');
    let activeIndex = -1;

    // Find the currently active item on load
    navItems.forEach((item, index) => {
      if (item.classList.contains('active')) {
        activeIndex = index;
      }
    });

    const animationTime = 600;
    const particleCount = 15;
    const particleDistances = [90, 10];
    const particleR = 100;
    const timeVariance = 300;
    const colors = [1, 2, 3, 1, 2, 3, 1, 4];

    const noise = (n = 1) => n / 2 - Math.random() * n;

    const getXY = (distance, pointIndex, totalPoints) => {
      const angle = ((360 + noise(8)) / totalPoints) * pointIndex * (Math.PI / 180);
      return [distance * Math.cos(angle), distance * Math.sin(angle)];
    };

    const createParticle = (i, t, d, r) => {
      let rotate = noise(r / 10);
      return {
        start: getXY(d[0], particleCount - i, particleCount),
        end: getXY(d[1] + noise(7), particleCount - i, particleCount),
        time: t,
        scale: 1 + noise(0.2),
        color: colors[Math.floor(Math.random() * colors.length)],
        rotate: rotate > 0 ? (rotate + r / 20) * 10 : (rotate - r / 20) * 10
      };
    };

    const makeParticles = element => {
      const d = particleDistances;
      const r = particleR;
      const bubbleTime = animationTime * 2 + timeVariance;
      element.style.setProperty('--time', `${bubbleTime}ms`);

      for (let i = 0; i < particleCount; i++) {
        const t = animationTime * 2 + noise(timeVariance * 2);
        const p = createParticle(i, t, d, r);
        element.classList.remove('active');

        setTimeout(() => {
          const particle = document.createElement('span');
          const point = document.createElement('span');
          particle.classList.add('particle');
          particle.style.setProperty('--start-x', `${p.start[0]}px`);
          particle.style.setProperty('--start-y', `${p.start[1]}px`);
          particle.style.setProperty('--end-x', `${p.end[0]}px`);
          particle.style.setProperty('--end-y', `${p.end[1]}px`);
          particle.style.setProperty('--time', `${p.time}ms`);
          particle.style.setProperty('--scale', `${p.scale}`);
          particle.style.setProperty('--color', `var(--color-${p.color}, white)`);
          particle.style.setProperty('--rotate', `${p.rotate}deg`);

          point.classList.add('point');
          particle.appendChild(point);
          element.appendChild(particle);
          requestAnimationFrame(() => {
            element.classList.add('active');
          });
          setTimeout(() => {
            try {
              element.removeChild(particle);
            } catch (e) {
              // Do nothing
            }
          }, t);
        }, 30);
      }
    };

    const updateEffectPosition = element => {
      const containerRect = container.getBoundingClientRect();
      const pos = element.getBoundingClientRect();

      const styles = {
        left: `${pos.x - containerRect.x}px`,
        top: `${pos.y - containerRect.y}px`,
        width: `${pos.width}px`,
        height: `${pos.height}px`
      };
      Object.assign(filterRef.style, styles);
      Object.assign(textRef.style, styles);

      const link = element.querySelector('.nav-link-item');
      if (link) {
        textRef.innerText = link.innerText;
      }
    };

    const setActiveTab = (index, triggerParticles = false) => {
      if (index === undefined || index < -1 || index >= navItems.length) return;

      const previousActive = navItems[activeIndex];
      if (previousActive) {
        previousActive.classList.remove('active');
      }

      activeIndex = index;
      if (index === -1) {
        // Hide gooey overlays
        filterRef.style.opacity = '0';
        textRef.style.opacity = '0';
        return;
      }

      // Restore opacity of overlays
      filterRef.style.opacity = '1';
      textRef.style.opacity = '1';

      const currentActive = navItems[index];
      currentActive.classList.add('active');

      updateEffectPosition(currentActive);

      if (triggerParticles) {
        // Clear previous particles
        const particles = filterRef.querySelectorAll('.particle');
        particles.forEach(p => {
          try {
            filterRef.removeChild(p);
          } catch (e) { }
        });

        // Trigger burst animations
        textRef.classList.remove('active');
        void textRef.offsetWidth; // Trigger reflow
        textRef.classList.add('active');

        makeParticles(filterRef);
      }
    };

    // Click handler for links
    navItems.forEach((item, index) => {
      const link = item.querySelector('.nav-link-item');
      if (!link) return;

      link.addEventListener('click', (e) => {
        if (activeIndex === index) return;
        setActiveTab(index, true);
      });
    });

    // Resize observer to keep the position aligned during window resizing
    const resizeObserver = new ResizeObserver(() => {
      const currentActiveLi = navItems[activeIndex];
      if (currentActiveLi) {
        updateEffectPosition(currentActiveLi);
      }
    });
    resizeObserver.observe(container);

    // Initial setup after loading screen hides or layout settles
    setTimeout(() => {
      container.classList.add('gooey-ready');
      window.dispatchEvent(new Event('scroll'));
    }, 200);

    // --- Scroll-Spy effect ---
    const sections = ['studio', 'services', 'works', 'footer'].map(id => document.getElementById(id));
    let isScrollingFromClick = false;
    let scrollTimeout;

    // Track when click navigation occurs to temporarily suspend scroll-spy updates
    navItems.forEach((item, index) => {
      const link = item.querySelector('.nav-link-item');
      if (!link) return;
      link.addEventListener('click', () => {
        isScrollingFromClick = true;
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          isScrollingFromClick = false;
        }, 800); // 800ms cooldown (longer than animation duration)
      });
    });

    window.addEventListener('scroll', () => {
      if (isScrollingFromClick) return;

      const scrollPos = window.scrollY + window.innerHeight / 3;
      let currentSectionIdx = -1;

      for (let i = 0; i < sections.length; i++) {
        const sec = sections[i];
        if (sec) {
          const top = sec.offsetTop;
          const height = sec.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            currentSectionIdx = i;
            break;
          }
        }
      }

      // Also trigger last item if user is at the bottom of the page
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 50) {
        currentSectionIdx = sections.length - 1;
      }

      if (currentSectionIdx !== activeIndex) {
        setActiveTab(currentSectionIdx, false); // Move pill smoothly without bursting particles
      }
    });
  }

  // --- 6. LIGHTWEIGHT STICKY SCROLL SNAP (bidirectional) ---
  // Direction-aware: snaps forward when scrolling down, backward when scrolling up.
  // Skips snapping while inside pinned sections (services / works) so their
  // internal scroll animations run uninterrupted.

  (() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    // Sections that have their own internal pinned scroll range — bypass snap inside them
    const pinnedSectionIds = ['services', 'works'];

    const allSections = Array.from(
      document.querySelectorAll('main, section, footer')
    ).filter(el => el.parentElement === document.body || el.tagName === 'MAIN');

    let isSnapping = false;
    let debounceTimer = null;

    // Track scroll direction
    let lastScrollY = window.scrollY;
    let scrollDirection = 'down'; // 'up' | 'down'

    window.addEventListener('scroll', () => {
      const currentY = window.scrollY;
      if (currentY !== lastScrollY) {
        scrollDirection = currentY > lastScrollY ? 'down' : 'up';
        lastScrollY = currentY;
      }
    }, { passive: true });

    /** Returns true if the viewport is currently inside a pinned section's scroll range */
    const insidePinnedSection = () => {
      for (const id of pinnedSectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        // If GSAP pinned the section, it wrapped it in a .pin-spacer. Use the spacer for rect measurements.
        const measureEl = el.parentElement && el.parentElement.classList.contains('pin-spacer') ? el.parentElement : el;
        const rect = measureEl.getBoundingClientRect();
        if (rect.top <= 2 && rect.bottom > window.innerHeight + 10) return true;
      }
      return false;
    };

    /** Direction-aware snap: forward on down, backward on up */
    const snapToNearest = () => {
      if (isSnapping) return;
      if (insidePinnedSection()) return;

      const scrollY = window.scrollY;
      const threshold = window.innerHeight * 0.45; // snap zone: 45% of viewport
      let bestEl = null;
      let bestDist = Infinity;

      for (const el of allSections) {
        const top = Math.round(scrollY + el.getBoundingClientRect().top);
        const offset = top - scrollY; // negative = section is above, positive = below

        if (scrollDirection === 'down') {
          // Only consider sections at or below current position
          if (offset >= -4 && offset < threshold) {
            if (offset < bestDist) { bestDist = offset; bestEl = el; }
          }
        } else {
          // Only consider sections at or above current position
          const upOffset = -offset; // how far above we are
          if (upOffset >= -4 && upOffset < threshold) {
            if (upOffset < bestDist) { bestDist = upOffset; bestEl = el; }
          }
        }
      }

      if (bestEl) {
        const targetY = Math.round(scrollY + bestEl.getBoundingClientRect().top);
        if (Math.abs(targetY - scrollY) < 4) return; // Already aligned
        isSnapping = true;
        window.scrollTo({ top: targetY, behavior: 'smooth' });
        setTimeout(() => { isSnapping = false; }, 900);
      }
    };

    // Use native scrollend where available (fires after momentum ends), fall back to debounce
    if ('onscrollend' in window) {
      window.addEventListener('scrollend', snapToNearest, { passive: true });
    } else {
      window.addEventListener('scroll', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(snapToNearest, 120);
      }, { passive: true });
    }
  })();

  // --- 7. INTERACTIVE EXPERTISE FOCUS SCROLL ANIMATION ---
  const initServicesFocusScroll = () => {
    const servicesSection = document.getElementById('services');
    const serviceItems = document.querySelectorAll('.service-focus-item');
    const servicesPinGuide = document.querySelector('.services-pin-guide');

    if (servicesSection && serviceItems.length > 0) {
      // Create ScrollTrigger to pin the section and scrub active focus items
      ScrollTrigger.create({
        trigger: servicesSection,
        start: 'top top',
        end: '+=3600', // Scroll distance pinned
        scrub: true,
        pin: true,
        anticipatePin: 1,
        onUpdate: (self) => {
          const itemCount = serviceItems.length;
          const progress = self.progress;

          // Determine active item index based on scroll progress division
          let activeIndex = Math.floor(progress * itemCount);
          if (activeIndex >= itemCount) activeIndex = itemCount - 1;
          if (activeIndex < 0) activeIndex = 0;

          serviceItems.forEach((item, idx) => {
            if (idx === activeIndex) {
              item.classList.add('active');
            } else {
              item.classList.remove('active');
            }
          });

          // Fade out left-column guide when user has scrolled past 70% of pinned range
          if (servicesPinGuide) {
            if (progress > 0.7) {
              servicesPinGuide.classList.add('hidden');
            } else {
              servicesPinGuide.classList.remove('hidden');
            }
          }
        }
      });
    }
  };

  initServicesFocusScroll();

  // --- 8. FLOATING LANYARD SCROLL TOGGLE ---
  const lanyardContainer = document.getElementById('lanyardContainer');
  if (lanyardContainer) {
    const handleLanyardVisibility = () => {
      // Reveal lanyard when user has scrolled past 80% viewport height
      if (window.scrollY > window.innerHeight * 0.8) {
        lanyardContainer.classList.add('visible');
      } else {
        lanyardContainer.classList.remove('visible');
      }
    };
    window.addEventListener('scroll', handleLanyardVisibility);
    handleLanyardVisibility();
  }

  // --- 9. HERO SCROLL INDICATOR FADE ---
  const heroScrollIndicator = document.getElementById('heroScrollIndicator');
  if (heroScrollIndicator) {
    const handleHeroScrollIndicator = () => {
      if (window.scrollY > 80) {
        gsap.to(heroScrollIndicator, { opacity: 0, y: 20, duration: 0.3, overwrite: 'auto' });
      } else {
        gsap.to(heroScrollIndicator, { opacity: 0.8, y: 0, duration: 0.5, overwrite: 'auto' });
      }
    };
    window.addEventListener('scroll', handleHeroScrollIndicator);
    handleHeroScrollIndicator();
  }

  // --- 9.5. SELECTED WORKS SECTION PINNING ---
  // Removed: ScrollStack (useWindowScroll=true) drives its own stacking via the page scroll.
  // No GSAP pin needed — ScrollStack's Lenis instance handles smooth scroll internally.

  // --- 10. LAZY LOAD REACT COMPONENTS BELOW THE FOLD ---
  // Lazy load Works Stack React Component when close to Works section
  const worksContainer = document.getElementById('works');
  if (worksContainer) {
    const worksObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          import('./works-entry.jsx');
          worksObserver.disconnect();
        }
      });
    }, { rootMargin: '400px' });
    worksObserver.observe(worksContainer);
  }

  // Lazy load Assurance Background React Component when close to Assurance section
  const assuranceContainer = document.getElementById('assurance');
  if (assuranceContainer) {
    const assuranceObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          import('./assurance-entry.jsx');
          assuranceObserver.disconnect();
        }
      });
    }, { rootMargin: '400px' });
    assuranceObserver.observe(assuranceContainer);
  }

  // Lazy load Lanyard 3D Canvas when scrolling starts
  const heroContainer = document.getElementById('hero');
  if (heroContainer) {
    const lanyardObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) {
          import('./lanyard-entry.jsx');
          lanyardObserver.disconnect();
        }
      });
    }, { threshold: 0.9 });
    lanyardObserver.observe(heroContainer);
  }
});
