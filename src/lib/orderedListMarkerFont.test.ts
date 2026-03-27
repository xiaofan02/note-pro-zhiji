import { describe, it, expect } from "vitest";
import { syncOrderedListMarkerFontSizes } from "./orderedListMarkerFont";

describe("syncOrderedListMarkerFontSizes", () => {
  it("syncs list item font-size from styled inline text", () => {
    const root = document.createElement("div");
    root.innerHTML = `
      <ol>
        <li><p><span style="font-size: 32px">接口配置</span></p></li>
      </ol>
    `;

    syncOrderedListMarkerFontSizes(root);

    const li = root.querySelector("li") as HTMLElement;
    expect(li.style.fontSize).toBe("32px");
  });

  it("removes stale inline size when no larger child font-size exists", () => {
    const root = document.createElement("div");
    root.innerHTML = `
      <ol>
        <li style="font-size: 28px"><p><span>接口名称</span></p></li>
      </ol>
    `;

    syncOrderedListMarkerFontSizes(root);

    const li = root.querySelector("li") as HTMLElement;
    expect(li.style.fontSize).toBe("");
  });

  it("does not keep stale inline size from old session", () => {
    const root = document.createElement("div");
    root.innerHTML = `
      <ol>
        <li style="font-size: 32px"><p>接口名称</p></li>
      </ol>
    `;

    syncOrderedListMarkerFontSizes(root);

    const li = root.querySelector("li") as HTMLElement;
    expect(li.style.fontSize).toBe("");
  });

  it("uses largest inline font-size when multiple styled spans exist", () => {
    const root = document.createElement("div");
    root.innerHTML = `
      <ol>
        <li>
          <p>
            <span style="font-size: 18px">接口</span>
            <span style="font-size: 30px">配置</span>
          </p>
        </li>
      </ol>
    `;

    syncOrderedListMarkerFontSizes(root);

    const li = root.querySelector("li") as HTMLElement;
    expect(li.style.fontSize).toBe("30px");
  });
});
