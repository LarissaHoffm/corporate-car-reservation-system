import * as React from "react";
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 500; 

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

type State = { toasts: ToasterToast[] };

const listeners = new Set<(state: State) => void>();
let memoryState: State = { toasts: [] };

type Action =
  | { type: "ADD_TOAST"; toast: ToasterToast }
  | { type: "UPDATE_TOAST"; toast: Partial<ToasterToast> & Pick<ToasterToast, "id"> }
  | { type: "DISMISS_TOAST"; toastId?: ToasterToast["id"] }
  | { type: "REMOVE_TOAST"; toastId?: ToasterToast["id"] }
  | { type: "CLEAR_ALL" };

let toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

function genId() {
  return Math.random().toString(36).slice(2, 11);
}

function setState(state: State) {
  memoryState = state;
  listeners.forEach((l) => l(state));
}

function addToRemoveQueue(toastId: string) {
  if (toastTimeouts.has(toastId)) return;
  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({ type: "REMOVE_TOAST", toastId });
  }, TOAST_REMOVE_DELAY);
  toastTimeouts.set(toastId, timeout);
}

function dispatch(action: Action) {
  switch (action.type) {
    case "ADD_TOAST": {
      const t = action.toast;
      const toasts = [t, ...memoryState.toasts].slice(0, TOAST_LIMIT);
      setState({ toasts });
      break;
    }
    case "UPDATE_TOAST": {
      setState({
        toasts: memoryState.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      });
      break;
    }
    case "DISMISS_TOAST": {
      const { toastId } = action;
      memoryState.toasts.forEach((t) => {
        if (toastId === undefined || t.id === toastId) addToRemoveQueue(t.id);
      });
      setState({
        toasts: memoryState.toasts.map((t) =>
          toastId === undefined || t.id === toastId ? { ...t, open: false } : t
        ),
      });
      break;
    }
    case "REMOVE_TOAST": {
      const { toastId } = action;
      setState({
        toasts: toastId
          ? memoryState.toasts.filter((t) => t.id !== toastId)
          : [],
      });
      break;
    }
    case "CLEAR_ALL": {
      setState({ toasts: [] });
      break;
    }
  }
}

export function useToast() {
  const [state, setLocalState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.add(setLocalState);
    return () => {
      listeners.delete(setLocalState);
    };
  }, []);

  const toast = React.useCallback(
    (props: Omit<ToasterToast, "id">) => {
      const id = genId();
      const newToast: ToasterToast = {
        id,
        open: true,
        duration: 4000,
        ...props,
      };
      dispatch({ type: "ADD_TOAST", toast: newToast });
      return {
        id,
        dismiss: () => dispatch({ type: "DISMISS_TOAST", toastId: id }),
        update: (p: Partial<Omit<ToasterToast, "id">>) =>
          dispatch({ type: "UPDATE_TOAST", toast: { id, ...p } }),
      };
    },
    []
  );

  const dismiss = React.useCallback((toastId?: string) => {
    dispatch({ type: "DISMISS_TOAST", toastId });
  }, []);

  const remove = React.useCallback((toastId?: string) => {
    dispatch({ type: "REMOVE_TOAST", toastId });
  }, []);

  const clearAll = React.useCallback(() => dispatch({ type: "CLEAR_ALL" }), []);

  return {
    ...state,
    toast,
    dismiss,
    remove,
    clearAll,
  };
}

export const toast = (...args: Parameters<ReturnType<typeof useToast>["toast"]>) => {
  const [props] = args;
  const id = genId();
  dispatch({ type: "ADD_TOAST", toast: { id, open: true, duration: 4000, ...props } });
  return {
    id,
    dismiss: () => dispatch({ type: "DISMISS_TOAST", toastId: id }),
    update: (p: Partial<Omit<ToasterToast, "id">>) =>
      dispatch({ type: "UPDATE_TOAST", toast: { id, ...p } }),
  };
};

export type { ToasterToast };
