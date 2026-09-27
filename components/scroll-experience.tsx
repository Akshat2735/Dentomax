"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const revealSelectors = [
  ".home-access-panels a",
  ".home-course-card",
  ".home-library-intro",
  ".home-learning-journey li",
  ".home-final-cta",
  ".catalogue-hero",
  ".catalogue-listing",
  ".library-introduction > section",
  ".library-experience > section",
  ".personal-dashboard > section",
  ".courses-hero",
  ".courses-listing",
  ".course-detail-hero",
  ".course-main-content > section",
  ".course-sidebar > section",
  ".page-shell > section",
  ".dashboard-section",
].join(",");

export function ScrollExperience() {
  const pathname = usePathname() ?? "/";

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = document.documentElement;
    const body = document.body;
    const isCourse = pathname.startsWith("/courses/") && pathname !== "/courses";
    body.dataset.courseProgress = isCourse ? "true" : "false";

    const nodes = Array.from(document.querySelectorAll<HTMLElement>(revealSelectors));
    const cards = Array.from(document.querySelectorAll<HTMLElement>(".course-card, .resource-card, .document-row, .curriculum-group, .dashboard-links a"));
    const revealItems = [
      ...nodes.map((node) => ({ node, card: false, delay: 0 })),
      ...cards.map((node, index) => ({ node, card: true, delay: Math.min(index % 8, 7) * 65 })),
    ];

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const item = revealItems.find(({ node }) => node === entry.target);
          const distance = item?.card ? 18 : 22;
          entry.target.animate(
            [
              { opacity: 0, transform: `translateY(${distance}px)${item?.card ? " rotate(-.45deg) scale(.982)" : ""}` },
              { opacity: 1, transform: "none" },
            ],
            { duration: 520, delay: item?.delay ?? 0, easing: "cubic-bezier(.2,.75,.25,1)", fill: "both" },
          );
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -9%", threshold: 0.08 });
    if (!reducedMotion) revealItems.forEach(({ node }) => observer.observe(node));

    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const maximum = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      root.style.setProperty("--site-scroll", String(Math.min(y / maximum, 1)));
      root.style.setProperty("--course-progress", isCourse ? String(Math.min(y / maximum, 1)) : "0");
      body.dataset.scrolled = y > 28 ? "true" : "false";
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      delete body.dataset.courseProgress;
      delete body.dataset.scrolled;
    };
  }, [pathname]);

  return <div className="site-reading-progress" aria-hidden="true"><span /></div>;
}
