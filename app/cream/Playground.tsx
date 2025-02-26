"use client";

import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree, extend, useLoader } from "@react-three/fiber";
import { useFluid } from "@/packages/use-shader-fx/src";
import { FxMaterial } from "./FxMaterial";

extend({ FxMaterial });

export const Playground = () => {
   const { size } = useThree();
   const [updateFluid, setFluid, { output: fluid }] = useFluid({
      size,
      dpr: {
         dpr: 0.08,
         effect: {
            fbo: false,
         },
      },
   });

   setFluid({
      density_dissipation: 0.99,
      velocity_dissipation: 0.99,
      splat_radius: 0.001,
   });

   useFrame((props) => {
      updateFluid(props);
   });

   return (
      <>
         <mesh>
            <planeGeometry args={[2, 2]} />
            <fxMaterial u_fx={fluid} key={FxMaterial.key} />
         </mesh>
      </>
   );
};
