import * as React from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { AsciiEffect } from './ascii-effect';

export type AsciiRendererProps = {
    renderIndex?: number;
    bgColor?: string;
    fgColor?: string;
    characters?: string;
    invert?: boolean;
    color?: boolean;
    resolution?: number;
};

export function AsciiRenderer({
    renderIndex = 1,
    bgColor = 'black',
    fgColor = 'white',
    characters = ' .:-+*=%@#',
    invert = true,
    color = false,
    resolution = 0.15,
}: AsciiRendererProps) {
    const { size, gl, scene, camera } = useThree();

    const effect = React.useMemo(() => {
        return new AsciiEffect(gl, characters, {
            invert,
            color,
            resolution,
        });
    }, [characters, invert, color, resolution, gl]);

    React.useLayoutEffect(() => {
        effect.domElement.style.color = fgColor;
        effect.domElement.style.backgroundColor = bgColor;
        effect.domElement.style.position = 'absolute';
        effect.domElement.style.top = '0px';
        effect.domElement.style.left = '0';
        effect.domElement.style.width = '100%';
        effect.domElement.style.display = 'flex';
        effect.domElement.style.justifyContent = 'center';
        effect.domElement.style.pointerEvents = 'none';
    }, [fgColor, bgColor, effect]);

    React.useEffect(() => {
        gl.domElement.style.opacity = '0';
        if (gl.domElement.parentNode) {
            gl.domElement.parentNode.appendChild(effect.domElement);
        }
        return () => {
            gl.domElement.style.opacity = '1';
            if (gl.domElement.parentNode) {
                gl.domElement.parentNode.removeChild(effect.domElement);
            }
        };
    }, [effect, gl]);

    React.useEffect(() => {
        if (size.width > 0 && size.height > 0) {
            effect.setSize(size.width, size.height);
        }
    }, [effect, size]);

    useFrame((state) => {
        effect.render(scene, camera);
    }, renderIndex);

    return null;
}
