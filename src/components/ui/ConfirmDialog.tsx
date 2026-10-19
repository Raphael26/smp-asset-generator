"use client";

import type { ReactNode } from "react";
import { Modal } from "./Modal";

/** An in-app confirmation. The browser's own confirm() is blocked in some embedded browsers, which made
 *  deletions fail silently. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Delete",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: ReactNode;
  message: ReactNode;
  confirmLabel?: string;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width={520}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-solid"
            autoFocus
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-[14px] text-ink-soft">{message}</p>
    </Modal>
  );
}
