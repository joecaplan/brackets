import { useEffect } from "react";
import { useRive } from "@rive-app/react-webgl2";
import textButtonRiv from "./assets/rive/textButton.riv";
import { formatButtonLabel } from "./riveTextFormat.js";

export default function RiveTextButton({ label, onClick, ...rest }) {
  const { rive, RiveComponent } = useRive({
    src: textButtonRiv,
    stateMachines: "buttonMachine",
    autoplay: true,
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
    try {
      if (fontSize !== null) {
        const sizeProp = vmi.number("textSize");
        if (sizeProp) sizeProp.value = fontSize;
      }
    } catch (e) { /* textSize property unavailable */ }

    rive.bindViewModelInstance(vmi);
  }, [rive, label]);

  return (
    <RiveComponent
      onClick={onClick}
      {...rest}
      style={{ width: "100%", maxWidth: 300, aspectRatio: "3 / 1",
        marginTop: -23, marginBottom: -23,
        cursor: "pointer", WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation", display: "block" }}
    />
  );
}
