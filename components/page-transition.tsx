"use client";

import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  return (
    <div className="app-frame page-transition" key={pathname} data-route={pathname}>
      {children}
    </div>
  );
}
