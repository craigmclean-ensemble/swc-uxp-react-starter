/*
Copyright 2023 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ModalContent } from "./ModalContent";
import { Theme } from "@swc-react/theme";

declare global {
  interface Window {
    React: typeof React;
    openModal?: () => void;
  }
}

window.React = React;

import { entrypoints } from "uxp";
import { AuthProvider } from "./contexts/AuthContext";

const MODAL_DIALOG_ID = "command-modal";
const MODAL_ROOT_ID = "modal-root";

function mount(container: HTMLElement | null, panelId: string): void {
  if (!container) return;
  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <Theme theme="spectrum" scale="medium" color="light">
        <App panelId={panelId} />
      </Theme>
    </React.StrictMode>
  );
}

function openModal(): void {
  // Use existing dialog from DOM or create one (command may run before panel loads)
  let dialog = document.getElementById(MODAL_DIALOG_ID) as HTMLDialogElement | null;
  let modalRoot = document.getElementById(MODAL_ROOT_ID);

  if (!dialog || !modalRoot) {
    dialog = document.createElement("dialog");
    dialog.id = MODAL_DIALOG_ID;
    dialog.style.width = "360px";
    dialog.style.minHeight = "200px";
    dialog.style.padding = "0";
    modalRoot = document.createElement("div");
    modalRoot.id = MODAL_ROOT_ID;
    dialog.appendChild(modalRoot);
    if (document.body) document.body.appendChild(dialog);
    else return;
  }

  const root = ReactDOM.createRoot(modalRoot);
  const onClose = (value?: string) => {
    dialog!.close(value);
  };
  root.render(
    <React.StrictMode>
      <AuthProvider>
        <ModalContent onClose={onClose} />
      </AuthProvider>
    </React.StrictMode>
  );

  const showOptions = {
    title: "Modal",
    resize: "none" as const,
    size: { width: 360, height: 220 },
  };

  if (typeof (dialog as HTMLDialogElement & { uxpShowModal?: (o: typeof showOptions) => Promise<unknown> }).uxpShowModal === "function") {
    (dialog as HTMLDialogElement & { uxpShowModal: (o: typeof showOptions) => Promise<unknown> })
      .uxpShowModal(showOptions)
      .finally(() => root.unmount());
  } else if (typeof (dialog as HTMLDialogElement & { showModal?: () => void }).showModal === "function") {
    (dialog as HTMLDialogElement & { showModal: () => void }).showModal();
    dialog.addEventListener("close", () => root.unmount(), { once: true });
  } else {
    dialog.showModal?.();
    dialog.addEventListener("close", () => root.unmount(), { once: true });
  }
}

const panelHandlers = {
  vanilla: {
    create(rootNode: HTMLElement) {
      const container = rootNode || document.getElementById("root");
      mount(container, "vanilla");
    },
  },
  tools: {
    create(rootNode: HTMLElement) {
      const container = rootNode || document.getElementById("root");
      mount(container, "tools");
    },
  },
};

const commandHandlers = {
  showModal: {
    run() {
      openModal();
    },
  },
};

if (typeof entrypoints !== "undefined" && entrypoints?.setup) {
  entrypoints.setup({ panels: panelHandlers, commands: commandHandlers });
  window.openModal = openModal;
} else {
  mount(document.getElementById("root"), "vanilla");
  window.openModal = openModal;
}
