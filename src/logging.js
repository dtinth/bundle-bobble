import React from "react";

export const logElementRef = React.createRef();

export function log(t) {
  const el = logElementRef.current;
  if (!el) return;
  const o = document.createElement("div");
  o.textContent = String(t);
  el.appendChild(o);
}
