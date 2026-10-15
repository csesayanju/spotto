import { useEffect, useRef } from "react";

interface Props {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** In-app replacement for window.confirm, styled like the rest of the game. */
export function ConfirmSheet({ title, message, confirmLabel, onConfirm, onCancel }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const cancel = useRef(onCancel);
  cancel.current = onCancel;

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && cancel.current();
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="sheet" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title"
      onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="sheet-inner compact">
        <h2 id="confirm-title">{title}</h2>
        <p>{message}</p>
        <button className="danger" onClick={onConfirm}>{confirmLabel}</button>
        <button ref={cancelRef} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
