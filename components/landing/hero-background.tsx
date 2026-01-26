"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AsciiRenderer } from "./ascii-renderer";
import { useRef } from "react";
import * as THREE from "three";

function SpinningShape() {
    const mesh = useRef<THREE.Mesh>(null);
    const viewport = useThree((state) => state.viewport);

    useFrame((state, delta) => {
        if (mesh.current) {
            mesh.current.rotation.x += delta * 0.2;
            mesh.current.rotation.y += delta * 0.25;
        }
    });

    return (
        <mesh ref={mesh} scale={viewport.width < 12 ? 2 : 3}>
            <icosahedronGeometry args={[2, 0]} />
            <meshStandardMaterial color="white" />
        </mesh>
    );
}

export function HeroBackground() {
    return (
        <div className="absolute inset-0 z-0 pointer-events-none opacity-20 overflow-hidden bg-black">
            <Canvas camera={{ position: [-1, 0, 10] }}>
                <color attach="background" args={["black"]} />
                <ambientLight intensity={0.5} />
                <spotLight position={[0, 10, 10]} angle={0.15} penumbra={1} />
                <pointLight position={[0, -10, -10]} />

                <SpinningShape />

                <AsciiRenderer
                    fgColor="white"
                    bgColor="transparent"
                    characters=" .:-+*=%@#"
                    invert={false}
                />
            </Canvas>
        </div>
    );
}
