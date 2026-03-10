import React from "react";
import { Theme } from "@swc-react/theme";

export interface ModalContentProps {
  onClose: (value?: string) => void;
}

export function ModalContent({ onClose }: ModalContentProps) {
  return (
    <Theme theme="spectrum" scale="medium" color="light">
      <div
        style={{
          padding: "16px",
          minWidth: "280px",
          minHeight: "120px",
          backgroundColor: "#fff",
          color: "#323232",
        }}
      >
        <h2 style={{ margin: "0 0 12px 0", fontSize: "16px" }}>Modal dialog</h2>
        <p style={{ margin: "0 0 16px 0", color: "#666" }}>
         This is modal.
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button type="button" onClick={() => onClose("cancel")}>
            Cancel
          </button>
          <button type="button" onClick={() => onClose("ok")}>
            OK
          </button>
        </div>
      </div>
    </Theme>
  );
}
