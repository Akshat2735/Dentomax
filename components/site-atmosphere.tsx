"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export type AtmosphereVariant =
  | "home"
  | "library"
  | "courses"
  | "course"
  | "study"
  | "auth"
  | "admin";

function variantFromPath(path: string): AtmosphereVariant {
  if (path === "/") return "home";
  if (path.startsWith("/courses/") && path !== "/courses") return "course";
  if (path === "/courses") return "courses";
  if (path.startsWith("/admin")) return "admin";
  if (
    path.startsWith("/sign-") ||
    path.startsWith("/login") ||
    path.startsWith("/forgot-password") ||
    path.startsWith("/reset-password") ||
    path.startsWith("/auth")
  ) {
    return "auth";
  }
  if (path === "/dashboard" || path === "/my-library" || path === "/bookmarks" || path === "/recent" || path === "/account") return "study";
  return "library";
}

function LibraryBackground() {
  return (
    <>
      <img className="atm-layer atm-environment atm-hall" src="/atmosphere/library-hall.webp" alt="" width={1920} height={1080} decoding="async" fetchPriority="high" />
      <img className="atm-shelf atm-shelf-left" src="/atmosphere/bookshelf-edge.webp" alt="" width={720} height={1280} decoding="async" />
      <img className="atm-shelf atm-shelf-right" src="/atmosphere/bookshelf-edge.webp" alt="" width={720} height={1280} decoding="async" />
      <img className="atm-column atm-column-left" src="/atmosphere/column.svg" alt="" width={200} height={900} decoding="async" />
      <img className="atm-column atm-column-right" src="/atmosphere/column.svg" alt="" width={200} height={900} decoding="async" />
    </>
  );
}

function AcademicPaperBackground() {
  return (
    <>
      <div className="atm-layer atm-manuscript" />
      <img className="atm-shelf atm-shelf-left atm-shelf-faint" src="/atmosphere/bookshelf-edge.webp" alt="" width={720} height={1280} decoding="async" loading="lazy" />
      <img className="atm-shelf atm-shelf-right atm-shelf-faint" src="/atmosphere/bookshelf-edge.webp" alt="" width={720} height={1280} decoding="async" loading="lazy" />
    </>
  );
}

function WarmStudyBackground() {
  return (
    <img className="atm-layer atm-environment atm-desk" src="/atmosphere/study-desk.webp" alt="" width={1600} height={900} decoding="async" loading="lazy" />
  );
}

function DarkInstitutionalBackground() {
  return (
    <img className="atm-layer atm-environment atm-night" src="/atmosphere/institutional-night.webp" alt="" width={1600} height={900} decoding="async" loading="lazy" />
  );
}

function MedicalIllustrationBackground() {
  return (
    <div className="atm-layer atm-medical">
      <img className="atm-plate" src="/atmosphere/dental-plate.webp" alt="" width={900} height={1200} decoding="async" loading="lazy" />
      <img className="atm-anatomy-line" src="/atmosphere/anatomy-lines.svg" alt="" width={400} height={640} decoding="async" />
      <img className="atm-dental-diagram" src="/atmosphere/dental-diagram.svg" alt="" width={320} height={420} decoding="async" />
    </div>
  );
}

export function SiteAtmosphere() {
  const variant = variantFromPath(usePathname() ?? "/");
  const root = useRef<HTMLDivElement>(null);
  const showLibrary = variant === "home" || variant === "library";
  const showPaper = variant === "courses" || variant === "course";
  const showDesk = variant === "study" || variant === "course";
  const showNight = variant === "admin" || variant === "auth" || variant === "home";

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        node.style.setProperty("--atm-scroll", (window.scrollY / max).toFixed(3));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [variant]);

  return (
    <div className="site-atmosphere" data-variant={variant} ref={root} aria-hidden="true">
      <div className="atm-layer atm-base" />
      <div className="atm-layer atm-texture" />
      {showNight && <DarkInstitutionalBackground />}
      {showLibrary && <LibraryBackground />}
      {showPaper && <AcademicPaperBackground />}
      {showDesk && <WarmStudyBackground />}
      <div className="atm-layer atm-architecture" />
      <div className="atm-layer atm-grid" />
      <MedicalIllustrationBackground />
      <div className="atm-layer atm-light" />
      <div className="atm-layer atm-readability" />
      <div className="atm-layer atm-vignette" />
    </div>
  );
}
