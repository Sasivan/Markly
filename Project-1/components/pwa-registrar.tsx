"use client";

import * as React from "react";

export function PwaRegistrar() {
  React.useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            // Service worker registered successfully
          })
          .catch((err) => {
            // Service worker registration optional/silent
          });
      });
    }
  }, []);

  return null;
}

