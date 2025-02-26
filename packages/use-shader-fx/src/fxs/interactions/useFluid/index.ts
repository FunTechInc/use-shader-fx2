import * as THREE from "three";
import { FluidMaterials, useMesh } from "./useMesh";
import { useCamera } from "../../../utils/useCamera";
import { useCallback, useMemo, useRef } from "react";
import { PointerValues, usePointer } from "../../../misc/usePointer";
import { RootState } from "@react-three/fiber";
import { useSingleFBO } from "../../../utils/useSingleFBO";
import { setUniform } from "../../../utils/setUniforms";
import { HooksProps, HooksReturn } from "../../types";
import { useParams } from "../../../utils/useParams";
import { UseFboProps } from "../../../utils/useSingleFBO";
import { DoubleRenderTarget, useDoubleFBO } from "../../../utils/useDoubleFBO";
import { getDpr } from "../../../utils/getDpr";

export type FluidParams = {
   /** density disspation , default : `0.98` */
   density_dissipation?: number;
   /** velocity dissipation , default : `0.99` */
   velocity_dissipation?: number;
   /** velocity acceleration , default : `10.0` */
   velocity_acceleration?: number;
   /** pressure dissipation , default : `0.9` */
   pressure_dissipation?: number;
   /** pressure iterations. affects performance , default : `20` */
   pressure_iterations?: number;
   /** curl_strength , default : `35` */
   curl_strength?: number;
   /** splat radius , default : `0.002` */
   splat_radius?: number;
   /** Fluid Color.THREE.Vector3 Alternatively, it accepts a function that returns THREE.Vector3.The function takes velocity:THREE.Vector2 as an argument. , default : `THREE.Vector3(1.0, 1.0, 1.0)` */
   fluid_color?:
      | ((velocity: THREE.Vector2) => THREE.Vector3)
      | THREE.Vector3
      | THREE.Color;
   /** When calling usePointer in a frame loop, setting PointerValues ​​to this value prevents double calls , default : `false` */
   pointerValues?: PointerValues | false;
};

export type FluidObject = {
   scene: THREE.Scene;
   mesh: THREE.Mesh;
   materials: FluidMaterials;
   camera: THREE.Camera;
   renderTarget: {
      velocity: DoubleRenderTarget;
      density: DoubleRenderTarget;
      curl: THREE.WebGLRenderTarget;
      divergence: THREE.WebGLRenderTarget;
      pressure: DoubleRenderTarget;
   };
   output: THREE.Texture;
};

export const FLUID_PARAMS: FluidParams = Object.freeze({
   density_dissipation: 0.98,
   velocity_dissipation: 0.99,
   velocity_acceleration: 10.0,
   pressure_dissipation: 0.9,
   pressure_iterations: 20,
   curl_strength: 35,
   splat_radius: 0.002,
   fluid_color: new THREE.Vector3(1.0, 1.0, 1.0),
   pointerValues: false,
});

/**
 * @link https://github.com/FunTechInc/use-shader-fx?tab=readme-ov-file#usage
 */
export const useFluid = ({
   size,
   dpr,
   samples,
   isSizeUpdate,
}: HooksProps): HooksReturn<FluidParams, FluidObject> => {
   const _dpr = getDpr(dpr);

   const scene = useMemo(() => new THREE.Scene(), []);
   const { materials, setMeshMaterial, mesh } = useMesh({
      scene,
      size,
      dpr: _dpr.shader,
   });
   const camera = useCamera(size);
   const updatePointer = usePointer();

   const fboProps = useMemo<UseFboProps>(
      () => ({
         scene,
         camera,
         dpr: _dpr.fbo,
         size,
         samples,
         isSizeUpdate,
      }),
      [scene, camera, size, samples, _dpr.fbo, isSizeUpdate]
   );
   const [velocityFBO, updateVelocityFBO] = useDoubleFBO(fboProps);
   const [densityFBO, updateDensityFBO] = useDoubleFBO(fboProps);
   const [curlFBO, updateCurlFBO] = useSingleFBO(fboProps);
   const [divergenceFBO, updateDivergenceFBO] = useSingleFBO(fboProps);
   const [pressureFBO, updatePressureFBO] = useDoubleFBO(fboProps);

   const lastTime = useRef(0);
   const scaledDiffVec = useRef(new THREE.Vector2(0, 0));
   const spaltVec = useRef(new THREE.Vector3(0, 0, 0));

   const [params, setParams] = useParams<FluidParams>(FLUID_PARAMS);

   const updateFx = useCallback(
      (props: RootState, updateParams?: FluidParams) => {
         const { gl, pointer, clock, size } = props;

         updateParams && setParams(updateParams);

         if (lastTime.current === 0) {
            lastTime.current = clock.getElapsedTime();
         }
         const dt = Math.min(
            (clock.getElapsedTime() - lastTime.current) / 3,
            0.02
         );
         lastTime.current = clock.getElapsedTime();

         // update velocity
         const velocityTex = updateVelocityFBO(gl, ({ read }) => {
            setMeshMaterial(materials.advectionMaterial);
            setUniform(materials.advectionMaterial, "uVelocity", read);
            setUniform(materials.advectionMaterial, "uSource", read);
            setUniform(materials.advectionMaterial, "dt", dt);
            setUniform(
               materials.advectionMaterial,
               "dissipation",
               params.velocity_dissipation!
            );
         });

         // update density
         const densityTex = updateDensityFBO(gl, ({ read }) => {
            setMeshMaterial(materials.advectionMaterial);
            setUniform(materials.advectionMaterial, "uVelocity", velocityTex);
            setUniform(materials.advectionMaterial, "uSource", read);
            setUniform(
               materials.advectionMaterial,
               "dissipation",
               params.density_dissipation!
            );
         });

         // update splatting
         const pointerValues = params.pointerValues! || updatePointer(pointer);

         if (pointerValues.isVelocityUpdate) {
            updateVelocityFBO(gl, ({ read }) => {
               setMeshMaterial(materials.splatMaterial);
               setUniform(materials.splatMaterial, "uTarget", read);
               setUniform(
                  materials.splatMaterial,
                  "point",
                  pointerValues.currentPointer
               );
               const scaledDiff = pointerValues.diffPointer.multiply(
                  scaledDiffVec.current
                     .set(size.width, size.height)
                     .multiplyScalar(params.velocity_acceleration!)
               );
               setUniform(
                  materials.splatMaterial,
                  "color",
                  spaltVec.current.set(scaledDiff.x, scaledDiff.y, 1.0)
               );
               setUniform(
                  materials.splatMaterial,
                  "radius",
                  params.splat_radius!
               );
            });
            updateDensityFBO(gl, ({ read }) => {
               setMeshMaterial(materials.splatMaterial);
               setUniform(materials.splatMaterial, "uTarget", read);
               const color: THREE.Vector3 | THREE.Color =
                  typeof params.fluid_color === "function"
                     ? params.fluid_color(pointerValues.velocity)
                     : params.fluid_color!;
               setUniform(materials.splatMaterial, "color", color);
            });
         }

         // update curl
         const curlTex = updateCurlFBO(gl, () => {
            setMeshMaterial(materials.curlMaterial);
            setUniform(materials.curlMaterial, "uVelocity", velocityTex);
         });

         // update vorticity
         updateVelocityFBO(gl, ({ read }) => {
            setMeshMaterial(materials.vorticityMaterial);
            setUniform(materials.vorticityMaterial, "uVelocity", read);
            setUniform(materials.vorticityMaterial, "uCurl", curlTex);
            setUniform(
               materials.vorticityMaterial,
               "curl",
               params.curl_strength!
            );
            setUniform(materials.vorticityMaterial, "dt", dt);
         });

         // update divergence
         const divergenceTex = updateDivergenceFBO(gl, () => {
            setMeshMaterial(materials.divergenceMaterial);
            setUniform(materials.divergenceMaterial, "uVelocity", velocityTex);
         });

         // update pressure
         updatePressureFBO(gl, ({ read }) => {
            setMeshMaterial(materials.clearMaterial);
            setUniform(materials.clearMaterial, "uTexture", read);
            setUniform(
               materials.clearMaterial,
               "value",
               params.pressure_dissipation!
            );
         });

         // solve pressure iterative (Gauss-Seidel)
         setMeshMaterial(materials.pressureMaterial);
         setUniform(materials.pressureMaterial, "uDivergence", divergenceTex);
         let pressureTexTemp: THREE.Texture;
         for (let i = 0; i < params.pressure_iterations!; i++) {
            pressureTexTemp = updatePressureFBO(gl, ({ read }) => {
               setUniform(materials.pressureMaterial, "uPressure", read);
            });
         }

         // update gradienSubtract
         updateVelocityFBO(gl, ({ read }) => {
            setMeshMaterial(materials.gradientSubtractMaterial);
            setUniform(
               materials.gradientSubtractMaterial,
               "uPressure",
               pressureTexTemp
            );
            setUniform(materials.gradientSubtractMaterial, "uVelocity", read);
         });

         return densityTex;
      },
      [
         materials,
         setMeshMaterial,
         updateCurlFBO,
         updateDensityFBO,
         updateDivergenceFBO,
         updatePointer,
         updatePressureFBO,
         updateVelocityFBO,
         setParams,
         params,
      ]
   );
   return [
      updateFx,
      setParams,
      {
         scene: scene,
         mesh: mesh,
         materials: materials,
         camera: camera,
         renderTarget: {
            velocity: velocityFBO,
            density: densityFBO,
            curl: curlFBO,
            divergence: divergenceFBO,
            pressure: pressureFBO,
         },
         output: densityFBO.read.texture,
      },
   ];
};
