import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { ThemeProvider } from "./theme/ThemeProvider";
import "./index.css";

// Ensure ancestor-scrolling methods are safely contained within the demo frame
// and never propagate to parent window or top-level documents
if (typeof Element !== "undefined" && Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function (arg?: boolean | ScrollIntoViewOptions) {
    let parent = this.parentElement;
    while (parent && parent !== document.body && parent !== document.documentElement) {
      const style = window.getComputedStyle(parent);
      const isScrollableVal = (val: string) => val === "auto" || val === "scroll" || val === "overlay";
      const canScrollY = isScrollableVal(style.overflowY) && parent.scrollHeight > parent.clientHeight;
      const canScrollX = isScrollableVal(style.overflowX) && parent.scrollWidth > parent.clientWidth;

      if (canScrollY || canScrollX) {
        const parentRect = parent.getBoundingClientRect();
        const elRect = this.getBoundingClientRect();
        const block = typeof arg === "object" && arg && arg.block ? arg.block : "start";
        const inline = typeof arg === "object" && arg && arg.inline ? arg.inline : "nearest";
        const isSmooth = typeof arg === "object" && arg?.behavior === "smooth";

        let targetTop = parent.scrollTop;
        if (canScrollY) {
          const relativeTop = elRect.top - parentRect.top + parent.scrollTop;
          if (block === "center") {
            targetTop = relativeTop - parent.clientHeight / 2 + elRect.height / 2;
          } else if (block === "end" || arg === false) {
            targetTop = relativeTop - parent.clientHeight + elRect.height;
          } else if (block === "nearest") {
            const isAbove = elRect.top < parentRect.top;
            const isBelow = elRect.bottom > parentRect.bottom;
            if (isAbove) {
              targetTop = relativeTop;
            } else if (isBelow) {
              targetTop = relativeTop - parent.clientHeight + elRect.height;
            }
          } else {
            targetTop = relativeTop;
          }
        }

        let targetLeft = parent.scrollLeft;
        if (canScrollX) {
          const relativeLeft = elRect.left - parentRect.left + parent.scrollLeft;
          if (inline === "center") {
            targetLeft = relativeLeft - parent.clientWidth / 2 + elRect.width / 2;
          } else if (inline === "end") {
            targetLeft = relativeLeft - parent.clientWidth + elRect.width;
          } else if (inline === "start") {
            targetLeft = relativeLeft;
          } else if (inline === "nearest") {
            const isLeft = elRect.left < parentRect.left;
            const isRight = elRect.right > parentRect.right;
            if (isLeft) {
              targetLeft = relativeLeft;
            } else if (isRight) {
              targetLeft = relativeLeft - parent.clientWidth + elRect.width;
            }
          }
        }

        if (isSmooth && typeof parent.scrollTo === "function") {
          parent.scrollTo({ top: targetTop, left: targetLeft, behavior: "smooth" });
        } else {
          parent.scrollTop = targetTop;
          parent.scrollLeft = targetLeft;
        }
        return;
      }
      parent = parent.parentElement;
    }
  };
}

// Prevent HTMLElement, SVGElement, and MathMLElement .focus from scrolling ancestor / parent windows
const focusPrototypes = [
  typeof HTMLElement !== "undefined" ? HTMLElement.prototype : null,
  typeof SVGElement !== "undefined" ? SVGElement.prototype : null,
  typeof (window as unknown as { MathMLElement?: { prototype: { focus?: unknown } } }).MathMLElement !== "undefined"
    ? (window as unknown as { MathMLElement: { prototype: { focus?: (options?: FocusOptions) => void } } }).MathMLElement.prototype
    : null,
].filter(Boolean) as Array<{ focus?: (options?: FocusOptions) => void }>;

for (const proto of focusPrototypes) {
  if (proto && typeof proto.focus === "function") {
    const originalFocus = proto.focus;
    proto.focus = function (options?: FocusOptions) {
      if (typeof options === "object" && options !== null) {
        originalFocus.call(this, { ...options, preventScroll: options.preventScroll ?? true });
      } else {
        originalFocus.call(this, { preventScroll: true });
      }
    };
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
