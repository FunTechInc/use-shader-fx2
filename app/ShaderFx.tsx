"use client";

import { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Perf } from "r3f-perf";
import { PerformanceMonitor } from "@react-three/drei";
import { Demo } from "./_demo";
import { CreateKit } from "./_createKit";

export const ShaderFx = () => {
   const [dpr, setDpr] = useState(1.5);
   return (
      <Canvas dpr={dpr}>
         <PerformanceMonitor
            factor={1}
            onChange={({ factor }) => {
               console.log(`dpr:${dpr}`);
               setDpr(Math.round((0.5 + 1.5 * factor) * 10) / 10);
            }}>
            <Suspense fallback={null}>
               <CreateKit />
            </Suspense>
            <Perf position={"bottom-left"} minimal={false} />
         </PerformanceMonitor>
      </Canvas>
   );
};
