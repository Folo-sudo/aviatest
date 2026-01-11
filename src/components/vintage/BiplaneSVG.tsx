export default function BiplaneSVG({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 800 400"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Construction grid lines */}
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#d8d8d8" strokeWidth="0.5" />
        </pattern>

        {/* Pencil stroke filter for hand-drawn effect */}
        <filter id="pencil" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>

      {/* Background grid */}
      <rect width="100%" height="100%" fill="url(#grid)" opacity="0.4" />

      {/* Center line */}
      <line x1="0" y1="200" x2="800" y2="200" stroke="#c0c0c0" strokeWidth="0.5" strokeDasharray="10,5" />

      {/* Main fuselage */}
      <g filter="url(#pencil)">
        {/* Fuselage body */}
        <path
          d="M 150 200
             Q 170 170 250 165
             L 550 160
             Q 620 160 650 175
             L 700 190
             Q 720 195 720 200
             Q 720 205 700 210
             L 650 225
             Q 620 240 550 240
             L 250 235
             Q 170 230 150 200 Z"
          stroke="#1a1a1a"
          strokeWidth="1.5"
          fill="none"
        />

        {/* Cockpit */}
        <path
          d="M 350 165
             Q 360 140 400 135
             Q 440 140 450 165"
          stroke="#1a1a1a"
          strokeWidth="1.5"
          fill="none"
        />
        <ellipse cx="400" cy="150" rx="35" ry="15" stroke="#1a1a1a" strokeWidth="1" fill="none" />

        {/* Engine cowling */}
        <ellipse cx="175" cy="200" rx="25" ry="35" stroke="#1a1a1a" strokeWidth="1.5" fill="none" />
        <line x1="150" y1="200" x2="130" y2="200" stroke="#1a1a1a" strokeWidth="2" />

        {/* Propeller */}
        <ellipse cx="120" cy="200" rx="8" ry="60" stroke="#1a1a1a" strokeWidth="1.5" fill="none" />
        <circle cx="120" cy="200" r="6" stroke="#1a1a1a" strokeWidth="1" fill="none" />

        {/* Upper wing */}
        <path
          d="M 250 120
             L 500 115
             Q 520 115 530 125
             L 530 135
             Q 520 145 500 145
             L 250 150
             Q 230 150 220 140
             L 220 130
             Q 230 120 250 120 Z"
          stroke="#1a1a1a"
          strokeWidth="1.5"
          fill="none"
        />

        {/* Lower wing */}
        <path
          d="M 270 250
             L 480 245
             Q 500 245 510 255
             L 510 265
             Q 500 275 480 275
             L 270 280
             Q 250 280 240 270
             L 240 260
             Q 250 250 270 250 Z"
          stroke="#1a1a1a"
          strokeWidth="1.5"
          fill="none"
        />

        {/* Wing struts */}
        <line x1="280" y1="150" x2="290" y2="250" stroke="#1a1a1a" strokeWidth="1" />
        <line x1="380" y1="145" x2="380" y2="250" stroke="#1a1a1a" strokeWidth="1" />
        <line x1="470" y1="145" x2="460" y2="250" stroke="#1a1a1a" strokeWidth="1" />

        {/* Cross wires */}
        <line x1="280" y1="150" x2="380" y2="250" stroke="#1a1a1a" strokeWidth="0.5" strokeDasharray="3,2" />
        <line x1="380" y1="145" x2="290" y2="250" stroke="#1a1a1a" strokeWidth="0.5" strokeDasharray="3,2" />
        <line x1="380" y1="145" x2="460" y2="250" stroke="#1a1a1a" strokeWidth="0.5" strokeDasharray="3,2" />
        <line x1="470" y1="145" x2="380" y2="250" stroke="#1a1a1a" strokeWidth="0.5" strokeDasharray="3,2" />

        {/* Tail section */}
        <path
          d="M 650 180
             L 720 130
             Q 735 125 740 135
             L 740 165
             Q 735 175 720 170
             L 680 175"
          stroke="#1a1a1a"
          strokeWidth="1.5"
          fill="none"
        />

        {/* Horizontal stabilizer */}
        <path
          d="M 680 200
             L 770 195
             Q 780 195 780 200
             Q 780 205 770 205
             L 680 200"
          stroke="#1a1a1a"
          strokeWidth="1.5"
          fill="none"
        />

        {/* Vertical stabilizer */}
        <path
          d="M 700 190
             L 730 140
             Q 735 130 745 130
             L 755 130
             Q 765 130 765 140
             L 750 180"
          stroke="#1a1a1a"
          strokeWidth="1.5"
          fill="none"
        />

        {/* Pontoons */}
        <path
          d="M 200 320
             Q 180 315 180 305
             L 190 295
             Q 210 290 450 290
             Q 470 290 480 300
             L 480 310
             Q 480 320 460 325
             L 200 325
             Q 190 325 200 320 Z"
          stroke="#1a1a1a"
          strokeWidth="1.5"
          fill="none"
        />

        {/* Pontoon struts */}
        <line x1="260" y1="280" x2="260" y2="290" stroke="#1a1a1a" strokeWidth="1.5" />
        <line x1="260" y1="280" x2="230" y2="290" stroke="#1a1a1a" strokeWidth="1" />
        <line x1="260" y1="280" x2="290" y2="290" stroke="#1a1a1a" strokeWidth="1" />

        <line x1="400" y1="280" x2="400" y2="290" stroke="#1a1a1a" strokeWidth="1.5" />
        <line x1="400" y1="280" x2="370" y2="290" stroke="#1a1a1a" strokeWidth="1" />
        <line x1="400" y1="280" x2="430" y2="290" stroke="#1a1a1a" strokeWidth="1" />

        {/* Pontoon step */}
        <line x1="350" y1="325" x2="350" y2="290" stroke="#1a1a1a" strokeWidth="0.5" strokeDasharray="2,2" />
      </g>

      {/* Technical annotations */}
      <g className="annotations" fontFamily="monospace" fontSize="9" fill="#4a5568">
        {/* Wingspan annotation */}
        <line x1="220" y1="100" x2="530" y2="100" stroke="#4a5568" strokeWidth="0.5" />
        <line x1="220" y1="95" x2="220" y2="105" stroke="#4a5568" strokeWidth="0.5" />
        <line x1="530" y1="95" x2="530" y2="105" stroke="#4a5568" strokeWidth="0.5" />
        <text x="375" y="95" textAnchor="middle">ENVERGURE 9.5m</text>

        {/* Fuselage length */}
        <line x1="120" y1="350" x2="780" y2="350" stroke="#4a5568" strokeWidth="0.5" />
        <line x1="120" y1="345" x2="120" y2="355" stroke="#4a5568" strokeWidth="0.5" />
        <line x1="780" y1="345" x2="780" y2="355" stroke="#4a5568" strokeWidth="0.5" />
        <text x="450" y="365" textAnchor="middle">LONGUEUR 8.2m</text>

        {/* Height annotation */}
        <line x1="60" y1="115" x2="60" y2="325" stroke="#4a5568" strokeWidth="0.5" />
        <line x1="55" y1="115" x2="65" y2="115" stroke="#4a5568" strokeWidth="0.5" />
        <line x1="55" y1="325" x2="65" y2="325" stroke="#4a5568" strokeWidth="0.5" />
        <text x="40" y="220" textAnchor="middle" transform="rotate(-90, 40, 220)">H 3.1m</text>

        {/* Part labels */}
        <text x="400" y="125" textAnchor="middle" fontSize="8">POSTE DE PILOTAGE</text>
        <text x="175" y="165" textAnchor="middle" fontSize="8">MOTEUR</text>
        <text x="120" y="140" textAnchor="middle" fontSize="8">HELICE</text>
        <text x="730" y="155" textAnchor="middle" fontSize="8">DERIVE</text>
        <text x="340" y="308" textAnchor="middle" fontSize="8">FLOTTEUR</text>

        {/* Cross-section reference */}
        <text x="580" y="200" textAnchor="start" fontSize="8">SEC. A-A</text>
        <line x1="570" y1="160" x2="570" y2="240" stroke="#4a5568" strokeWidth="0.5" strokeDasharray="5,3" />
      </g>

      {/* Scale indicator */}
      <g transform="translate(680, 50)">
        <rect x="0" y="0" width="80" height="20" stroke="#1a1a1a" strokeWidth="0.5" fill="none" />
        <rect x="0" y="0" width="40" height="20" fill="#1a1a1a" />
        <text x="40" y="35" textAnchor="middle" fontFamily="monospace" fontSize="8" fill="#4a5568">1:100</text>
      </g>

      {/* Drawing title block */}
      <g transform="translate(600, 370)">
        <rect x="0" y="0" width="180" height="25" stroke="#1a1a1a" strokeWidth="1" fill="none" />
        <text x="90" y="17" textAnchor="middle" fontFamily="serif" fontSize="10" fill="#1a1a1a">HYDRAVION BIPLAN - VUE LATERALE</text>
      </g>
    </svg>
  );
}
