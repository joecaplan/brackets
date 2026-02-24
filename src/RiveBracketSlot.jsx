import { useEffect } from "react";
import { useRive, Layout, Fit } from "@rive-app/react-canvas";
import textButtonRiv from "./assets/rive/textButton.riv";
import { formatButtonLabel } from "./riveTextFormat.js";

export default function RiveBracketSlot({ label, width = 148, height = 48 }) {
  const { rive, RiveComponent } = useRive({
    src: textButtonRiv,
    stateMachines: "buttonMachine",
    autoplay: true,
    layout: new Layout({ fit: Fit.Fill }),
  });

  useEffect(() => {
    if (!rive) return;
    const vm = rive.viewModelByName("buttonModel");
    if (!vm) return;
    const vmi = vm.defaultInstance();
    if (!vmi) return;

    const { text, fontSize } = formatButtonLabel(label);

    vmi.string("buttonText").value = text;

    // Set font size if text needs scaling.
    if (fontSize !== null) {
      const sizeProp = vmi.number("textSize");
      if (sizeProp) sizeProp.value = fontSize;
    }

    rive.bindViewModelInstance(vmi);
  }, [rive, label]);

  return (
    <div style={{ width, height, overflow: "hidden" }}>
      <RiveComponent style={{ width, height, display: "block" }} />
    </div>
  );
}
