export type ToastTone = "success" | "error" | "info";

export type ToastDetail = {
  message: string;
  tone?: ToastTone;
  duration?: number;
};

export function emitToast(message: string, tone: ToastTone = "info", duration = 3800) {
  if (typeof window === "undefined" || !message.trim()) return;
  window.dispatchEvent(new CustomEvent<ToastDetail>("dentomax:toast", { detail: { message, tone, duration } }));
}
