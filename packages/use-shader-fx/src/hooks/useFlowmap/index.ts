import * as THREE from "three";
import { useMesh } from "./useMesh";
import { useCamera } from "../../utils/useCamera";
import { useDoubleFBO } from "../../utils/useDoubleFBO";
import { useCallback, useMemo } from "react";
import { RootState, Size } from "@react-three/fiber";
import { usePointer } from "../../utils/usePointer";
import { setUniform } from "../../utils/setUniforms";
import { HooksReturn } from "../types";
import { useParams } from "../../utils/useParams";
import { DoubleRenderTarget } from "../../utils/types";

export type FlowmapParams = {
   /** size of the stamp, percentage of the size ,default:0.1 */
   radius?: number;
   /** 拡大率 , default:0.0 */
   magnification?: number;
   /** opacity  , default:0.0 */
   alpha?: number;
   /** 拡散率。1にすると残り続ける , default:0.9 */
   dissipation?: number;
};

export type FlowmapObject = {
   scene: THREE.Scene;
   material: THREE.Material;
   camera: THREE.Camera;
   renderTarget: DoubleRenderTarget;
};

export const FLOWMAP_PARAMS: FlowmapParams = {
   radius: 0.1,
   magnification: 0.0,
   alpha: 0.0,
   dissipation: 0.9,
};

/**
 * @link https://github.com/takuma-hmng8/use-shader-fx#usage
 */
export const useFlowmap = ({
   size,
   dpr,
}: {
   size: Size;
   dpr: number;
}): HooksReturn<FlowmapParams, FlowmapObject> => {
   const scene = useMemo(() => new THREE.Scene(), []);
   const material = useMesh({ scene, size, dpr });
   const camera = useCamera(size);
   const updatePointer = usePointer();
   const [renderTarget, updateRenderTarget] = useDoubleFBO({
      scene,
      camera,
      size,
   });

   const [params, setParams] = useParams<FlowmapParams>(FLOWMAP_PARAMS);

   const updateFx = useCallback(
      (props: RootState, updateParams?: FlowmapParams) => {
         const { gl, pointer } = props;

         updateParams && setParams(updateParams);

         setUniform(material, "uRadius", params.radius!);
         setUniform(material, "uAlpha", params.alpha!);
         setUniform(material, "uDissipation", params.dissipation!);
         setUniform(material, "uMagnification", params.magnification!);

         const { currentPointer, velocity } = updatePointer(pointer);
         setUniform(material, "uMouse", currentPointer);
         setUniform(material, "uVelocity", velocity);

         const bufferTexture = updateRenderTarget(gl, ({ read }) => {
            setUniform(material, "uMap", read);
         });

         return bufferTexture;
      },
      [material, updatePointer, updateRenderTarget, params, setParams]
   );
   return [
      updateFx,
      setParams,
      {
         scene: scene,
         material: material,
         camera: camera,
         renderTarget: renderTarget,
      },
   ];
};
