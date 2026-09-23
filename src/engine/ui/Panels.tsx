"use client";
import { useUi } from "../state/ui";
import { ChoiceCards } from "./ChoiceCards";
import { IdentityForm } from "./IdentityForm";
import { SwipeGesture } from "./SwipeGesture";

export function Panels() {
  const panel = useUi((s) => s.panel);
  if (!panel) return null;
  switch (panel.kind) {
    case "identity":
      return <IdentityForm />;
    case "choice":
      return <ChoiceCards prompt={panel.prompt} options={panel.options} />;
    case "swipe":
      return <SwipeGesture label={panel.label} />;
  }
}
