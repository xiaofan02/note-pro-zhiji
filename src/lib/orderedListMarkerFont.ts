export function syncOrderedListMarkerFontSizes(root: HTMLElement): void {
  root.querySelectorAll("ol li").forEach((li) => {
    const liEl = li as HTMLElement;
    const currentLiPx = parseFloat(window.getComputedStyle(liEl).fontSize || "") || 0;
    let maxPx = currentLiPx;

    const descendants = liEl.querySelectorAll<HTMLElement>("*");
    descendants.forEach((node) => {
      // Ignore nested list items; only sync by current li visual content.
      if (node.closest("li") !== liEl) return;

      // Prefer explicit inline font-size (from editor font-size command).
      const inlineRaw = node.style.fontSize?.trim();
      const inlinePx = parseFloat(inlineRaw || "");
      if (inlineRaw && Number.isFinite(inlinePx) && inlinePx > maxPx) {
        maxPx = inlinePx;
      }

      // Respect actual rendered size for headings / styled wrappers.
      const computedPx = parseFloat(window.getComputedStyle(node).fontSize || "");
      if (Number.isFinite(computedPx) && computedPx > maxPx) {
        maxPx = computedPx;
      }
    });

    // Only apply override when content is visually larger than base li font.
    if (maxPx > currentLiPx + 0.5) {
      liEl.style.fontSize = `${maxPx}px`;
    } else {
      // Remove stale inline override when no longer needed.
      liEl.style.removeProperty("font-size");
    }
  });
}
