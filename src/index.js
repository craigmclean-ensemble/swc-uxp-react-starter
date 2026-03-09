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
import App from "./App.js";
window.React = React;

import { Theme } from "@swc-react/theme";

// Static import only — dynamic import("uxp") triggers eval in the bundle, which UXP disallows
import { entrypoints } from "uxp";

function mount(container, panelId) {
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

const panelHandlers = {
  vanilla: {
    create(rootNode) {
      const container = rootNode || document.getElementById("root");
      mount(container, "vanilla");
    },
  },
  tools: {
    create(rootNode) {
      const container = rootNode || document.getElementById("root");
      mount(container, "tools");
    },
  },
};

if (typeof entrypoints !== "undefined" && entrypoints && entrypoints.setup) {
  entrypoints.setup({ panels: panelHandlers });
} else {
  mount(document.getElementById("root"), "vanilla");
}
