import React from "react";
import { Theme } from "@swc-react/theme";
import { useAuth } from "./contexts/AuthContext";

export interface ModalContentProps {
  onClose: (value?: string) => void;
}

export function ModalContent({ onClose }: ModalContentProps) {
  const { isAuthorized, loading, handleConnect, handleDisconnect, error } = useAuth();

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
        {isAuthorized ? (
          <>
            <h2 style={{ margin: "0 0 12px 0", fontSize: "16px" }}>Logged in to Dropbox</h2>
            <p style={{ margin: "0 0 16px 0", color: "#666" }}>
              Your account is connected. You can close this window or log out below.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button type="button" onClick={() => { handleDisconnect(); onClose(); }}>
                Log out
              </button>
              <button type="button" onClick={() => onClose()}>
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 style={{ margin: "0 0 12px 0", fontSize: "16px" }}>Login to Dropbox</h2>
            <p style={{ margin: "0 0 16px 0", color: "#666" }}>
              To get started using this add-on, connect your Dropbox account.
            </p>
            {error && (
              <p style={{ margin: "0 0 12px 0", color: "#c00", fontSize: "14px" }}>
                Sign-in failed or was cancelled. Please try again.
              </p>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button type="button" onClick={handleConnect} disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </button>
              {loading && (
                <button type="button" onClick={handleDisconnect}>
                  Cancel
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </Theme>
  );
}
