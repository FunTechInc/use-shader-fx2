import * as THREE from "three";
import { useMesh } from "./useMesh";
import { useCamera } from "../../../utils/useCamera";
import { useCallback, useMemo, useRef } from "react";
import { RootState } from "@react-three/fiber";
import { PointerValues, usePointer } from "../../../misc/usePointer";
import { setUniform } from "../../../utils/setUniforms";
import { HooksProps, HooksReturn } from "../../types";
import { useParams } from "../../../utils/useParams";
import { DoubleRenderTarget, useDoubleFBO } from "../../../utils/useDoubleFBO";
import { getDpr } from "../../../utils/getDpr";

export type BrushParams = {
   /** Texture applied to the brush, If texture is true, it will take precedence over color , default : `false` */
   texture?: THREE.Texture | false;
   /** You can attach an fx map , default : `false` */
   map?: THREE.Texture | false;
   /** map intensity , default : `0.1` */
   mapIntensity?: number;
   /** size of the stamp, percentage of the size ,default : `0.05` */
   radius?: number;
   /** Strength of smudge effect , default : `0.0`*/
   smudge?: number;
   /** dissipation rate. If set to 1, it will remain. , default : `1.0` */
   dissipation?: number;
   /** Strength of motion blur , default : `0.0` */
   motionBlur?: number;
   /** Number of motion blur samples. Affects performance default : `5` */
   motionSample?: number;
   /** brush color , it accepts a function that returns THREE.Vector3.The function takes velocity:THREE.Vector2 as an argument. , default : `THREE.Vector3(1.0, 1.0, 1.0)` */
   color?:
      | ((velocity: THREE.Vector2) => THREE.Vector3)
      | THREE.Vector3
      | THREE.Color;
   /** Follows the cursor even if it loses speed , default : `false` */
   isCursor?: boolean;
   /** brush pressure (0 to 1) , default : `1.0` */
   pressure?: number;
   /** When calling usePointer in a frame loop, setting PointerValues ​​to this value prevents double calls , default : `false` */
   pointerValues?: PointerValues | false;
};

export type BrushObject = {
   scene: THREE.Scene;
   mesh: THREE.Mesh;
   material: THREE.Material;
   camera: THREE.Camera;
   renderTarget: DoubleRenderTarget;
   output: THREE.Texture;
};

export const BRUSH_PARAMS: BrushParams = Object.freeze({
   texture: false,
   map: false,
   mapIntensity: 0.1,
   radius: 0.05,
   smudge: 0.0,
   dissipation: 1.0,
   motionBlur: 0.0,
   motionSample: 5,
   color: new THREE.Vector3(1.0, 0.0, 0.0),
   isCursor: false,
   pressure: 1.0,
   pointerValues: false,
});

/**
 * @link https://github.com/FunTechInc/use-shader-fx?tab=readme-ov-file#usage
 */
export const useBrush = ({
   size,
   dpr,
   samples,
   isSizeUpdate,
}: HooksProps): HooksReturn<BrushParams, BrushObject> => {
   const _dpr = getDpr(dpr);

   const scene = useMemo(() => new THREE.Scene(), []);
   const { material, mesh } = useMesh({ scene, size, dpr: _dpr.shader });
   const camera = useCamera(size);
   const updatePointer = usePointer();
   const [renderTarget, updateRenderTarget] = useDoubleFBO({
      scene,
      camera,
      size,
      dpr: _dpr.fbo,
      samples,
      isSizeUpdate,
   });

   const [params, setParams] = useParams<BrushParams>(BRUSH_PARAMS);

   const pressureEnd = useRef<number | null>(null);

   const updateFx = useCallback(
      (props: RootState, updateParams?: BrushParams) => {
         const { gl, pointer } = props;

         updateParams && setParams(updateParams);

         if (params.texture!) {
            setUniform(material, "uIsTexture", true);
            setUniform(material, "uTexture", params.texture!);
         } else {
            setUniform(material, "uIsTexture", false);
         }

         if (params.map!) {
            setUniform(material, "uIsMap", true);
            setUniform(material, "uMap", params.map!);
            setUniform(material, "uMapIntensity", params.mapIntensity!);
         } else {
            setUniform(material, "uIsMap", false);
         }

         setUniform(material, "uRadius", params.radius!);
         setUniform(material, "uSmudge", params.smudge!);
         setUniform(material, "uDissipation", params.dissipation!);
         setUniform(material, "uMotionBlur", params.motionBlur!);
         setUniform(material, "uMotionSample", params.motionSample!);

         const pointerValues = params.pointerValues! || updatePointer(pointer);

         if (pointerValues.isVelocityUpdate) {
            setUniform(material, "uMouse", pointerValues.currentPointer);
            setUniform(material, "uPrevMouse", pointerValues.prevPointer);
         }
         setUniform(material, "uVelocity", pointerValues.velocity);

         const color: THREE.Vector3 | THREE.Color =
            typeof params.color === "function"
               ? params.color(pointerValues.velocity)
               : params.color!;
         setUniform(material, "uColor", color);

         setUniform(material, "uIsCursor", params.isCursor!);

         // pressure
         setUniform(material, "uPressureEnd", params.pressure!);
         if (pressureEnd.current === null) {
            pressureEnd.current = params.pressure!;
         }
         setUniform(material, "uPressureStart", pressureEnd.current);
         pressureEnd.current = params.pressure!;

         return updateRenderTarget(gl, ({ read }) => {
            setUniform(material, "uBuffer", read);
         });
      },
      [material, updatePointer, updateRenderTarget, params, setParams]
   );

   return [
      updateFx,
      setParams,
      {
         scene: scene,
         mesh: mesh,
         material: material,
         camera: camera,
         renderTarget: renderTarget,
         output: renderTarget.read.texture,
      },
   ];
};
