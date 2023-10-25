import { useCallback, useMemo } from "react";
import * as THREE from "three";
import { useMesh } from "./useMesh";
import { useCamera } from "../utils/useCamera";
import { RootState } from "@react-three/fiber";
import { useSingleFBO } from "../utils/useSingleFBO";
import { setUniform } from "../utils/setUniforms";

export type DuoToneParams = {
   texture: THREE.Texture;
   color0: THREE.Color;
   color1: THREE.Color;
};

/**
 * @returns handleUpdate(props: RootState)=> THREE.WebGLRenderTarget.texture
 */
export const useDuoTone = () => {
   const scene = useMemo(() => new THREE.Scene(), []);
   const material = useMesh(scene);
   const camera = useCamera();
   const updateRenderTarget = useSingleFBO(scene, camera);

   const handleUpdate = useCallback(
      (props: RootState, params: DuoToneParams) => {
         const { gl } = props;
         const { texture, color0, color1 } = params;
         //set params
         setUniform(material, "uTexture", texture);
         setUniform(material, "uColor0", color0);
         setUniform(material, "uColor1", color1);
         //update render target
         const bufferTexture = updateRenderTarget(gl);
         //return buffer
         return bufferTexture;
      },
      [updateRenderTarget, material]
   );
   return handleUpdate;
};
