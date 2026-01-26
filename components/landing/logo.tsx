import React from "react"
export const Logo = (props: React.SVGProps<SVGSVGElement>) => {
    return (
        <svg
            viewBox="0 0 80 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <text
                x="0"
                y="18"
                fill="white"
                fontFamily="ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Monaco, Consolas, monospace"
                fontSize="20"
                fontWeight="400"
                letterSpacing="-0.02em"
            >
                scribe
            </text>
        </svg>
    );
};
