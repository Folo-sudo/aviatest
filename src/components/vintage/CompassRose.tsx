export default function CompassRose({
  className = "",
  size = 80
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer circle */}
      <circle cx="50" cy="50" r="45" stroke="#1a1a1a" strokeWidth="1" fill="none" />
      <circle cx="50" cy="50" r="42" stroke="#c0c0c0" strokeWidth="0.5" fill="none" />

      {/* Inner circles */}
      <circle cx="50" cy="50" r="35" stroke="#1a1a1a" strokeWidth="0.5" fill="none" />
      <circle cx="50" cy="50" r="8" stroke="#1a1a1a" strokeWidth="1" fill="none" />
      <circle cx="50" cy="50" r="3" stroke="#1a1a1a" strokeWidth="1" fill="#1a1a1a" />

      {/* Main cardinal points - N, E, S, W */}
      {/* North point */}
      <polygon
        points="50,8 46,35 50,30 54,35"
        stroke="#1a1a1a"
        strokeWidth="1"
        fill="#1a1a1a"
      />
      <polygon
        points="50,92 46,65 50,70 54,65"
        stroke="#1a1a1a"
        strokeWidth="1"
        fill="none"
      />

      {/* East point */}
      <polygon
        points="92,50 65,46 70,50 65,54"
        stroke="#1a1a1a"
        strokeWidth="1"
        fill="none"
      />

      {/* West point */}
      <polygon
        points="8,50 35,46 30,50 35,54"
        stroke="#1a1a1a"
        strokeWidth="1"
        fill="none"
      />

      {/* Intercardinal points - NE, SE, SW, NW */}
      {/* NE */}
      <line x1="50" y1="50" x2="79" y2="21" stroke="#1a1a1a" strokeWidth="0.75" />
      {/* SE */}
      <line x1="50" y1="50" x2="79" y2="79" stroke="#1a1a1a" strokeWidth="0.75" />
      {/* SW */}
      <line x1="50" y1="50" x2="21" y2="79" stroke="#1a1a1a" strokeWidth="0.75" />
      {/* NW */}
      <line x1="50" y1="50" x2="21" y2="21" stroke="#1a1a1a" strokeWidth="0.75" />

      {/* Degree marks */}
      {Array.from({ length: 36 }).map((_, i) => {
        const angle = (i * 10 - 90) * (Math.PI / 180);
        const innerR = i % 9 === 0 ? 38 : i % 3 === 0 ? 40 : 42;
        const outerR = 45;
        return (
          <line
            key={i}
            x1={50 + innerR * Math.cos(angle)}
            y1={50 + innerR * Math.sin(angle)}
            x2={50 + outerR * Math.cos(angle)}
            y2={50 + outerR * Math.sin(angle)}
            stroke="#1a1a1a"
            strokeWidth={i % 9 === 0 ? 1 : 0.5}
          />
        );
      })}

      {/* Cardinal labels */}
      <text x="50" y="20" textAnchor="middle" fontFamily="serif" fontSize="8" fontWeight="600" fill="#1a1a1a">N</text>
      <text x="50" y="88" textAnchor="middle" fontFamily="serif" fontSize="8" fontWeight="600" fill="#1a1a1a">S</text>
      <text x="85" y="53" textAnchor="middle" fontFamily="serif" fontSize="8" fontWeight="600" fill="#1a1a1a">E</text>
      <text x="15" y="53" textAnchor="middle" fontFamily="serif" fontSize="8" fontWeight="600" fill="#1a1a1a">O</text>

      {/* Decorative fleur-de-lis at North (simplified) */}
      <path
        d="M 50 5 L 48 3 L 50 1 L 52 3 Z"
        stroke="#1a1a1a"
        strokeWidth="0.5"
        fill="#1a1a1a"
      />
    </svg>
  );
}
