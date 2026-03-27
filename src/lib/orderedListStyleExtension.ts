import OrderedList from "@tiptap/extension-ordered-list";

export const OrderedListStyle = OrderedList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      numberingStyle: {
        default: "default",
        parseHTML: (element) => element.getAttribute("data-numbering-style") || "default",
        renderHTML: (attributes) => {
          const value = attributes.numberingStyle as string | undefined;
          if (!value || value === "default") return {};
          return { "data-numbering-style": value };
        },
      },
      type: {
        default: "1",
        parseHTML: (element) => element.getAttribute("type") || "1",
        renderHTML: (attributes) => {
          const listType = attributes.type as string | undefined;
          if (!listType || listType === "1") return {};
          return { type: listType };
        },
      },
      start: {
        default: 1,
        parseHTML: (element) => {
          const raw = element.getAttribute("start");
          if (!raw) return 1;
          const parsed = parseInt(raw, 10);
          return Number.isNaN(parsed) ? 1 : parsed;
        },
        renderHTML: (attributes) => {
          const start = Number(attributes.start ?? 1);
          if (!start || start === 1) return {};
          return { start };
        },
      },
    };
  },
});
