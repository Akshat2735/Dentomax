"use client";

import { useEffect, useState } from "react";
import type { ToastDetail, ToastTone } from "@/lib/toast";

type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
};

export function SiteToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    let nextId = 1;
    const timers = new Map<number, number>();

    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<ToastDetail>).detail;
      if (!detail?.message) return;
      const id = nextId++;
      const tone = detail.tone ?? "info";
      setToasts((current) => [...current.slice(-2), { id, message: detail.message, tone }]);
      timers.set(id, window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
        timers.delete(id);
      }, detail.duration ?? 3800));
    };

    window.addEventListener("dentomax:toast", onToast);
    return () => {
      window.removeEventListener("dentomax:toast", onToast);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="site-toasts" aria-live="polite" aria-relevant="additions">
      {toasts.map((toast) => (
        <p className={`site-toast site-toast-${toast.tone}`} key={toast.id} role={toast.tone === "error" ? "alert" : "status"}>
          <span>{toast.message}</span>
          <button type="button" aria-label="Dismiss notification" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}>
            ×
          </button>
        </p>
      ))}
    </div>
  );
}
