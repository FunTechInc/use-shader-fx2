import * as THREE from "three";
import { shaderMaterial } from "@react-three/drei";
import fragment from "./main.frag";

declare global {
   namespace JSX {
      interface IntrinsicElements {
         fxMaterial: any;
      }
   }
}

export type FxMaterialProps = {
   u_noise: THREE.Texture;
   u_colorStrata: THREE.Texture;
   u_brush: THREE.Texture;
   u_grain: THREE.Texture;
   u_noiseIntensity: number;
   u_funkun: THREE.Texture;
   u_time: number;
};

export const FxMaterial = shaderMaterial(
   {
      u_noise: new THREE.Texture(),
      u_colorStrata: new THREE.Texture(),
      u_brush: new THREE.Texture(),
      u_grain: new THREE.Texture(),
      u_funkun: new THREE.Texture(),
      u_noiseIntensity: 1,
      u_time: 0,
   },

   `
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = vec4(position, 1.0);
		}
	`,
   fragment
);
