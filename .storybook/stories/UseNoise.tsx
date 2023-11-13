import * as React from "react";
import { useFrame, extend, useThree } from "@react-three/fiber";
import { FxTextureMaterial } from "../../utils/fxTextureMaterial";
import { FxMaterial, TFxMaterial } from "../../utils/fxMaterial";
import { useNoise } from "../../packages/use-shader-fx/src";
import {
   NoiseParams,
   NOISE_PARAMS,
} from "../../packages/use-shader-fx/src/hooks/useNoise";
import GUI from "lil-gui";
import { useGUI } from "../../utils/useGUI";

extend({ FxMaterial, FxTextureMaterial });

// GUI
const CONFIG: NoiseParams = NOISE_PARAMS;
const setGUI = (gui: GUI) => {
   gui.add(CONFIG, "timeStrength", 0, 10, 0.01);
   gui.add(CONFIG, "noiseOctaves", 0, 10, 1);
   gui.add(CONFIG, "fbmOctaves", 0, 10, 1);
};
const setConfig = () => {
   return {
      timeStrength: CONFIG.timeStrength,
      noiseOctaves: CONFIG.noiseOctaves,
      fbmOctaves: CONFIG.fbmOctaves,
   } as NoiseParams;
};

/**
 * noise 単体で使うというよりは、他のhookのnoiseに渡す感じで使いましょう！fxの重ねがけをするときに、noiseの計算を一度にするためです。
 */
export const UseNoise = (args: NoiseParams) => {
   const updateGUI = useGUI(setGUI);

   const fxRef = React.useRef<TFxMaterial>();
   const size = useThree((state) => state.size);
   const dpr = useThree((state) => state.viewport.dpr);
   const [updateNoise] = useNoise({ size, dpr });

   useFrame((props) => {
      const fx = updateNoise(props, setConfig());
      fxRef.current!.u_fx = fx;
      updateGUI();
   });

   return (
      <mesh>
         <planeGeometry args={[2, 2]} />
         <fxMaterial key={FxMaterial.key} ref={fxRef} />
      </mesh>
   );
};
