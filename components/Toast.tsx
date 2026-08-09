"use client";

import { useEffect } from "react";
import { CheckCircle, XCircle, X } from "lucide-react";

type ToastType = "success" | "error";

export default function Toast({
  show,
  message,
  type = "success",
  onClose,
}: {
  show: boolean;
  message: string;
  type?: ToastType;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [show, onClose]);

  if (!show) return null;

  const bg = type === "success" ? "bg-emerald-600" : "bg-rose-600";
  const Icon = type === "success" ? CheckCircle : XCircle;

  return (
    <div className={`fixed top-4 right-4 z-50 ${bg} text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-slide-up`}>
      <Icon size={18} />
      <span className="font-semibold">{message}</span>
      <button onClick={onClose} className="ml-2 p-0.5 rounded hover:bg-white/20 transition-colors">
        <X size={14} />
      </button>
    </div>
  );
}
