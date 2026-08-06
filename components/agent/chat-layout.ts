export const chatPanelPaddingClass = "px-4 sm:px-6";
export const chatMessageColumnClass = "mx-auto w-full max-w-2xl";
export const chatInputColumnClass = `mx-auto w-full max-w-3xl ${chatPanelPaddingClass}`;
export const chatScrollerContentClass = `flex h-max min-h-full w-full flex-col gap-6 py-6 ${chatPanelPaddingClass}`;
export const chatFooterSpacerClass = "pb-44";
export const chatFloatingFooterClass =
  "pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col";
/* Overlaps the composer by ~6px so the opaque end sits just below its top lip.
   Leave the right edge clear so the message scrollbar / gutter stays visible. */
export const chatFooterFadeClass =
  "chat-footer-fade relative z-0 -mb-1.5 mr-3 h-10 shrink-0";
/* Interactive only on the composer column — keep the scrollbar gutter clickable. */
export const chatFooterInputAreaClass = "relative z-10 mr-3 pb-4";
export const chatFooterSolidClass =
  "pointer-events-none absolute bottom-0 left-0 right-0 top-1.5 bg-sidebar";
export const chatFooterInteractiveClass = "pointer-events-auto";
export const chatScrollButtonClass =
  "pointer-events-auto z-10 data-[direction=end]:bottom-2";

/** @deprecated Use chatInputColumnClass */
export const chatContentClass = chatInputColumnClass;
