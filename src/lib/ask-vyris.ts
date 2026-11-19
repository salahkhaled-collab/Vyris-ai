// Opening the assistant from anywhere (the phone tab bar, "Prep me" on Today)
// without wiring props through the layout. GlobalAIChat listens.

export const ASK_EVENT = "vyris:ask";
export const ASK_STATE_EVENT = "vyris:ask-state";

export interface AskDetail {
  /** Put this in the message box (not sent until the user taps send). */
  prompt?: string;
  /** Close the panel if it's already open (the tab bar button). */
  toggle?: boolean;
  /** Close it (another tab was tapped). */
  close?: boolean;
}

export function closeAskVyris(): void {
  openAskVyris({ close: true });
}

export function openAskVyris(detail: AskDetail = {}): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<AskDetail>(ASK_EVENT, { detail }));
}
