import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export interface NoteLinkOptions {
  onTrigger: (query: string, pos: number) => void;
  onClose: () => void;
}

export const NoteLinkExtension = Extension.create<NoteLinkOptions>({
  name: "noteLink",

  addOptions() {
    return {
      onTrigger: () => {},
      onClose: () => {},
    };
  },

  addProseMirrorPlugins() {
    const { onTrigger, onClose } = this.options;
    return [
      new Plugin({
        key: new PluginKey("noteLink"),
        props: {
          handleKeyDown(view, event) {
            // Close on Escape
            if (event.key === "Escape") {
              onClose();
            }
            return false;
          },
        },
        view() {
          return {
            update(view) {
              const { state } = view;
              const { selection } = state;
              const { $from } = selection;
              const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
              const match = textBefore.match(/\[\[([^\]]*)$/);
              if (match) {
                onTrigger(match[1], $from.pos - match[1].length - 2);
              } else {
                onClose();
              }
            },
          };
        },
      }),
    ];
  },
});
