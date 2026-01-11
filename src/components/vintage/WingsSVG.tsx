export default function WingsSVG({
  className = "",
  width = 120
}: {
  className?: string;
  width?: number;
}) {
  return (
    <svg
      viewBox="0 0 120 40"
      width={width}
      height={width * (40 / 120)}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Left wing */}
      <path
        d="M 55 20
           Q 50 18 45 16
           L 10 12
           Q 5 11 3 13
           Q 1 15 3 18
           L 8 20
           Q 5 22 3 22
           Q 1 25 3 27
           Q 5 29 10 28
           L 45 24
           Q 50 22 55 20"
        stroke="#1a1a1a"
        strokeWidth="1.5"
        fill="none"
      />

      {/* Right wing */}
      <path
        d="M 65 20
           Q 70 18 75 16
           L 110 12
           Q 115 11 117 13
           Q 119 15 117 18
           L 112 20
           Q 115 22 117 22
           Q 119 25 117 27
           Q 115 29 110 28
           L 75 24
           Q 70 22 65 20"
        stroke="#1a1a1a"
        strokeWidth="1.5"
        fill="none"
      />

      {/* Center medallion */}
      <circle cx="60" cy="20" r="8" stroke="#1a1a1a" strokeWidth="1.5" fill="none" />
      <circle cx="60" cy="20" r="5" stroke="#1a1a1a" strokeWidth="0.75" fill="none" />

      {/* Propeller hub style center */}
      <circle cx="60" cy="20" r="2" stroke="#1a1a1a" strokeWidth="1" fill="#1a1a1a" />

      {/* Wing ribbing details - left */}
      <line x1="15" y1="14" x2="15" y2="26" stroke="#c0c0c0" strokeWidth="0.5" />
      <line x1="25" y1="15" x2="25" y2="25" stroke="#c0c0c0" strokeWidth="0.5" />
      <line x1="35" y1="16" x2="35" y2="24" stroke="#c0c0c0" strokeWidth="0.5" />
      <line x1="45" y1="17" x2="45" y2="23" stroke="#c0c0c0" strokeWidth="0.5" />

      {/* Wing ribbing details - right */}
      <line x1="105" y1="14" x2="105" y2="26" stroke="#c0c0c0" strokeWidth="0.5" />
      <line x1="95" y1="15" x2="95" y2="25" stroke="#c0c0c0" strokeWidth="0.5" />
      <line x1="85" y1="16" x2="85" y2="24" stroke="#c0c0c0" strokeWidth="0.5" />
      <line x1="75" y1="17" x2="75" y2="23" stroke="#c0c0c0" strokeWidth="0.5" />
    </svg>
  );
}
