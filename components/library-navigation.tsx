"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase-browser";
import { emitToast } from "@/lib/toast";

function isActive(path: string, href: string) {
  if (href === "/") return path === "/";
  if (href === "/books") {
    return path === "/library" || path === "/explore" || path === "/my-library" || path === "/bookmarks" || path === "/recent";
  }
  if (href === "/courses") return path === "/courses" || path.startsWith("/courses/");
  if (href === "/dashboard") return path === "/dashboard";
  if (href === "/account") return path === "/account";
  return path === href;
}

function chromeFromPath(path: string) {
  if (path.startsWith("/document")) return "reader";
  if (path === "/sign-up") return "split";
  if (path.startsWith("/admin")) return "admin";
  if (path.startsWith("/auth")) return "minimal";
  return "default";
}

function initialsFor(user: User | null) {
  const source = String(user?.user_metadata?.username ?? user?.user_metadata?.name ?? user?.email ?? "D");
  return source.slice(0, 1).toUpperCase();
}

export function LibraryNavigation() {
  const path = usePathname() ?? "/";
  const router = useRouter();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const mobileId = useId();
  const signedIn = Boolean(user);

  useEffect(() => {
    document.body.dataset.chrome = chromeFromPath(path);
    return () => {
      delete document.body.dataset.chrome;
    };
  }, [path]);

  useEffect(() => {
    let active = true;
    const applySession = async (sessionUser: User | null | undefined) => {
      if (!active) return;
      setUser(sessionUser ?? null);
      if (!sessionUser) { setIsAdmin(false); return; }
      const { data } = await supabase.from("profiles").select("role, status").eq("id", sessionUser.id).maybeSingle();
      if (active) setIsAdmin(data?.role === "admin" && data.status === "active");
    };
    void supabase.auth.getSession().then(({ data }) => void applySession(data.session?.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session?.user);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    setAccountOpen(false);
    setMobileOpen(false);
  }, [path]);

  useEffect(() => {
    const locked = mobileOpen;
    document.body.style.overflow = locked ? "hidden" : "";
    document.body.dataset.navOpen = locked ? "true" : "false";
    return () => {
      document.body.style.overflow = "";
      delete document.body.dataset.navOpen;
    };
  }, [mobileOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        setAccountOpen(false);
      }
    };
    const onPointer = (event: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) setAccountOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, []);

  async function signOut() {
    setAccountOpen(false);
    setMobileOpen(false);
    await supabase.auth.signOut();
    emitToast("You have signed out.", "info");
    router.push("/");
  }

  const primary = [
    { href: "/", label: "Home" },
    { href: "/courses", label: "Courses" },
    { href: "/books", label: "Books" },
    { href: "/about", label: "About" },
  ];

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="global-nav site-header">
        <Link className="brand-lockup" href="/">
          <span className="brand-mark">D</span>
          <span>
            Dentomax <small>Library</small>
          </span>
        </Link>
        <nav className="site-header-links" aria-label="Primary">
          {primary.map((item) => (
            <Link className={isActive(path, item.href) ? "active" : ""} href={item.href} key={item.href} aria-current={isActive(path, item.href) ? "page" : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="nav-utilities" ref={accountRef}>
          {user === undefined ? (
            <span className="nav-auth-skeleton" aria-hidden="true" />
          ) : signedIn ? (
            <>
              <button
                className="avatar"
                type="button"
                aria-label="Open account menu"
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                onClick={() => setAccountOpen((open) => !open)}
              >
                {initialsFor(user)}
              </button>
              {accountOpen && (
                <div className="account-menu" role="menu">
                  <Link href="/account" role="menuitem">
                    Account
                  </Link>
                  {isAdmin && <Link href="/admin" role="menuitem">Admin dashboard</Link>}
                  <button type="button" role="menuitem" onClick={() => void signOut()}>
                    Sign out
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="nav-auth-links">
              <Link className="nav-text-link" href="/sign-in">
                Sign in
              </Link>
              <Link className="button button-compact" href="/sign-up">
                Request access
              </Link>
            </div>
          )}
          <button
            className="nav-menu-toggle"
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls={mobileId}
            onClick={() => setMobileOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className="mobile-nav-layer">
          <button className="mobile-nav-backdrop" type="button" aria-label="Close menu" onClick={() => setMobileOpen(false)} />
          <nav className="mobile-nav-panel" id={mobileId} aria-label="Mobile">
            <div className="mobile-nav-head">
              <p className="eyebrow">Navigate</p>
              <button type="button" className="mobile-nav-close" aria-label="Close menu" onClick={() => setMobileOpen(false)}>
                ×
              </button>
            </div>
            {primary.map((item) => (
              <Link className={isActive(path, item.href) ? "active" : ""} href={item.href} key={item.href} onClick={() => setMobileOpen(false)}>
                {item.label}
              </Link>
            ))}
            {signedIn ? (
              <>
                <p className="mobile-nav-label">Account</p>
                <Link href="/account" onClick={() => setMobileOpen(false)}>
                  Account
                </Link>
                {isAdmin && <Link href="/admin" onClick={() => setMobileOpen(false)}>Admin dashboard</Link>}
                <button type="button" onClick={() => void signOut()}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <p className="mobile-nav-label">Access</p>
                <Link href="/sign-in" onClick={() => setMobileOpen(false)}>
                  Sign in
                </Link>
                <Link href="/sign-up" onClick={() => setMobileOpen(false)}>
                  Request access
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </>
  );
}

export const SiteHeader = LibraryNavigation;
