"use client";

// Store global mínimo de toasts (fora de React, publicado via useSyncExternalStore),
// no mesmo espírito do hook clássico do shadcn/ui — sem dependência externa.
import * as React from "react";
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

const TOAST_LIMIT = 3;
let count = 0;
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

let memoryState: { toasts: ToasterToast[] } = { toasts: [] };
const listeners: Array<(state: { toasts: ToasterToast[] }) => void> = [];

function dispatch(toasts: ToasterToast[]) {
  memoryState = { toasts };
  listeners.forEach((listener) => listener(memoryState));
}

type Toast = Omit<ToasterToast, "id">;

function toast({ ...props }: Toast) {
  const id = genId();
  const dismiss = () => dispatch(memoryState.toasts.filter((t) => t.id !== id));

  dispatch([{ ...props, id, open: true } as ToasterToast, ...memoryState.toasts].slice(0, TOAST_LIMIT));
  setTimeout(dismiss, 5000);

  return { id, dismiss };
}

function useToast() {
  const [state, setState] = React.useState(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);

  return { ...state, toast };
}

export { useToast, toast };
