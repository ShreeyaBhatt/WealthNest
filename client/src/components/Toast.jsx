import {
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";

import { CheckCircle2, AlertCircle, X } from "lucide-react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const show = (message, type = "success") => {
    setToast({ message, type });

    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const value = useMemo(
    () => ({
      show,
    }),
    []
  );

  const isError = toast?.type === "error";

  return (
    <ToastContext.Provider value={value}>
      {children}

      {toast && (
        <div className="fixed right-6 top-6 z-50 animate-in slide-in-from-top-4 duration-300">
          <div
            className={`flex min-w-[320px] items-start gap-3 rounded-xl border bg-white p-4 shadow-xl ${
              isError
                ? "border-rose-200"
                : "border-emerald-200"
            }`}
          >
            {isError ? (
              <AlertCircle
                size={22}
                className="mt-0.5 text-rose-600"
              />
            ) : (
              <CheckCircle2
                size={22}
                className="mt-0.5 text-emerald-600"
              />
            )}

            <div className="flex-1">
              <p className="font-semibold text-slate-900">
                {isError ? "Something went wrong" : "Success"}
              </p>

              <p className="mt-1 text-sm text-slate-600">
                {toast.message}
              </p>
            </div>

            <button
              onClick={() => setToast(null)}
              className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}