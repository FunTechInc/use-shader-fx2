import * as THREE from "three";
import vertexShader from "./shader/main.vert";
import fragmentShader from "./shader/main.frag";
import { useMemo } from "react";
import { useResolution } from "../utils/useResolution";
import { useAddMesh } from "../utils/useAddMesh";
import { setUniform } from "../utils/setUniforms";

type TcreateMesh = {
   texture?: THREE.Texture;
   scene: THREE.Scene;
   radius: number;
   alpha: number;
   smudge: number;
   dissipation: number;
   magnification: number;
   motionBlur: number;
   motionSample: number;
};

type TUniforms = {
   tMap: { value: THREE.Texture | null };
   tTexture: { value: THREE.Texture | null };
   uResolution: { value: THREE.Vector2 };
   uRadius: { value: number };
   uAlpha: { value: number };
   uSmudge: { value: number };
   uDissipation: { value: number };
   uAspect: { value: number };
   uMouse: { value: THREE.Vector2 };
   uPrevMouse: { value: THREE.Vector2 };
   uVelocity: { value: THREE.Vector2 };
   uMagnification: { value: number };
   uMotionBlur: { value: number };
   uMotionSample: { value: number };
};

// Extend THREE.ShaderMaterial to strictly type the uniforms
export class FlowmapShaderMaterial extends THREE.ShaderMaterial {
   uniforms!: TUniforms;
}

export const useMesh = ({
   texture,
   scene,
   radius,
   alpha,
   smudge,
   dissipation,
   magnification,
   motionBlur,
   motionSample,
}: TcreateMesh) => {
   const geometry = useMemo(() => new THREE.PlaneGeometry(2, 2), []);
   const material = useMemo(
      () =>
         new THREE.ShaderMaterial({
            uniforms: {
               tMap: {
                  value: null,
               },
               tTexture: { value: texture },
               uResolution: { value: new THREE.Vector2(0, 0) },
               uAspect: { value: 1 },
               uRadius: { value: radius },
               uAlpha: { value: alpha },
               uSmudge: { value: smudge },
               uDissipation: { value: dissipation },
               uMouse: { value: new THREE.Vector2(0, 0) },
               uPrevMouse: { value: new THREE.Vector2(0, 0) },
               uVelocity: { value: new THREE.Vector2(0, 0) },
               uMagnification: { value: magnification },
               uMotionBlur: { value: motionBlur },
               uMotionSample: { value: motionSample },
            },
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
         }),
      [
         radius,
         alpha,
         dissipation,
         magnification,
         smudge,
         texture,
         motionBlur,
         motionSample,
      ]
   );

   const resolution = useResolution();
   setUniform(material, "uAspect", resolution.width / resolution.height);
   setUniform(material, "uResolution", resolution.clone());

   useAddMesh(scene, geometry, material);

   return material as FlowmapShaderMaterial;
};
