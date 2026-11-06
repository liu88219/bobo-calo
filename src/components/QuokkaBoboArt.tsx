import React, { useId } from 'react';

const FUR = '#C48B60';
const INK = '#161210';
const TONGUE = '#E2766A';
const BOBO_WHITE = '#FFFFFF';
const RED_TEE = '#C83B32';
const NAVY_SWEATER = '#25385B';
const DENIM_OVERALL = '#2A537A';
const OLIVE_VEST = '#485F44';
const WOOD_STOOL = '#6B4A31';
const BED_SHEET = '#F5F0E4';
const BED_BLANKET = '#D4DEC9';
const PILLOW_CREAM = '#FFFDF8';
const CHEER_CREAM = '#FFFDF5';

function CrayonFilterDef({ id, scale = 2.4 }: { id: string; scale?: number }) {
  return (
    <defs>
      <filter id={id} x="-12%" y="-12%" width="124%" height="124%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.075"
          numOctaves="3"
          seed="11"
          result="noise"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="noise"
          scale={scale}
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </defs>
  );
}

function DtQuokkaHead({
  cx,
  cy,
  scale = 1,
  filterId,
  mouth = 'open',
  sweatDrop = false,
}: {
  cx: number;
  cy: number;
  scale?: number;
  filterId: string;
  mouth?: 'open' | 'smile';
  sweatDrop?: boolean;
}) {
  return (
    <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>
      <g filter={`url(#${filterId})`}>
        <circle cx="-14" cy="-21" r="9.5" fill={FUR} />
        <circle cx="14" cy="-21" r="9.5" fill={FUR} />
        <ellipse cx="0" cy="0" rx="23" ry="21.5" fill={FUR} />
      </g>
      <ellipse cx="-6.2" cy="-7" rx="2.1" ry="2.5" fill={INK} />
      <ellipse cx="6.2" cy="-7" rx="2.1" ry="2.5" fill={INK} />
      <ellipse cx="0" cy="-0.2" rx="3.6" ry="4.8" fill={INK} />
      {mouth === 'open' ? (
        <>
          <ellipse cx="0" cy="9.2" rx="4.6" ry="4.2" fill={INK} />
          <ellipse cx="0" cy="11" rx="2.9" ry="1.7" fill={TONGUE} />
        </>
      ) : (
        <path
          d="M-5.5 7.5 Q0 12.5 5.5 7.5"
          fill="none"
          stroke={INK}
          strokeWidth="2.3"
          strokeLinecap="round"
        />
      )}
      {sweatDrop && (
        <path
          d="M20 -13 Q23 -8 21.5 -5 A2.4 2.4 0 1 1 18 -5 Q17 -8 20 -13 Z"
          fill="#7DB4D4"
        />
      )}
    </g>
  );
}

function DtBobo({
  cx,
  cy,
  scale = 1,
  filterId,
  armsUp = true,
  armsWide = false,
  cheerLines = true,
  redBag = false,
  className = '',
}: {
  cx: number;
  cy: number;
  scale?: number;
  filterId: string;
  armsUp?: boolean;
  armsWide?: boolean;
  cheerLines?: boolean;
  redBag?: boolean;
  className?: string;
}) {
  return (
    <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>
      <g className={className}>
        <g filter={`url(#${filterId})`}>
          <circle cx="-13" cy="-23" r="6.5" fill={BOBO_WHITE} />
          <circle cx="13" cy="-23" r="6.5" fill={BOBO_WHITE} />
          <ellipse cx="0" cy="-9" rx="18.5" ry="15.5" fill={BOBO_WHITE} />
          <ellipse cx="0" cy="11" rx="19.5" ry="19" fill={BOBO_WHITE} />
          {armsWide ? (
            <>
              <ellipse cx="-23" cy="2" rx="9.5" ry="4.5" fill={BOBO_WHITE} />
              <ellipse cx="23" cy="2" rx="9.5" ry="4.5" fill={BOBO_WHITE} />
            </>
          ) : armsUp ? (
            <>
              <ellipse
                cx="-19"
                cy="1"
                rx="7.5"
                ry="5"
                transform="rotate(-28 -19 1)"
                fill={BOBO_WHITE}
              />
              <ellipse
                cx="19"
                cy="-1"
                rx="7.5"
                ry="5"
                transform="rotate(28 19 -1)"
                fill={BOBO_WHITE}
              />
            </>
          ) : (
            <>
              <ellipse
                cx="-18"
                cy="8"
                rx="6.5"
                ry="4.8"
                transform="rotate(20 -18 8)"
                fill={BOBO_WHITE}
              />
              <ellipse
                cx="18"
                cy="8"
                rx="6.5"
                ry="4.8"
                transform="rotate(-20 18 8)"
                fill={BOBO_WHITE}
              />
            </>
          )}
          <ellipse cx="-8.5" cy="28" rx="6" ry="4" fill={BOBO_WHITE} />
          <ellipse cx="8.5" cy="28" rx="6" ry="4" fill={BOBO_WHITE} />
          {redBag && (
            <path
              d="M13 -2 C22 -2 22 14 13 14"
              fill="none"
              stroke={RED_TEE}
              strokeWidth="4.2"
              strokeLinecap="round"
            />
          )}
        </g>

        <ellipse cx="-4.2" cy="-12.5" rx="1.65" ry="2" fill={INK} />
        <ellipse cx="4.2" cy="-12.5" rx="1.65" ry="2" fill={INK} />
        <ellipse cx="0" cy="-8.2" rx="2.1" ry="1.6" fill={INK} />
        <path
          d="M0 -7.2 L0 -4.8 M-4.5 -5.2 Q-2.2 -2.2 0 -5 Q2.2 -2.2 4.5 -5.2"
          fill="none"
          stroke={INK}
          strokeWidth="1.65"
          strokeLinecap="round"
        />

        {cheerLines && (
          <g stroke={CHEER_CREAM} strokeWidth="2.1" strokeLinecap="round">
            <line x1="-24" y1="-26" x2="-30" y2="-32" />
            <line x1="23" y1="-28" x2="29" y2="-34" />
            <line x1="27" y1="-19" x2="34" y2="-21" />
          </g>
        )}
      </g>
    </g>
  );
}

function DtMarsh({
  cx,
  cy,
  rotate = 0,
  filterId,
}: {
  cx: number;
  cy: number;
  rotate?: number;
  filterId: string;
}) {
  return (
    <g transform={`translate(${cx}, ${cy}) rotate(${rotate})`}>
      <rect
        x="-8"
        y="-6.5"
        width="16"
        height="13"
        rx="4"
        fill={BOBO_WHITE}
        filter={`url(#${filterId})`}
      />
      <circle cx="-2.6" cy="-1" r="1.1" fill={INK} />
      <circle cx="2.6" cy="-1" r="1.1" fill={INK} />
      <path
        d="M-1.8 2 Q0 3.6 1.8 2"
        fill="none"
        stroke={INK}
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </g>
  );
}

/**
 * Cozy DINOTAENG Wooden Bed with Pillow & Folded Sage Blanket for Bed Workouts!
 */
function CozyBedStage({ filterId }: { filterId: string }) {
  return (
    <g filter={`url(#${filterId})`}>
      {/* Warm Wood Headboard & Legs */}
      <rect x="24" y="102" width="10" height="54" rx="4" fill={WOOD_STOOL} />
      <rect x="190" y="128" width="9" height="28" rx="3" fill={WOOD_STOOL} />
      <rect x="24" y="138" width="175" height="9" rx="3" fill={WOOD_STOOL} />
      {/* Soft Cream Mattress */}
      <rect x="32" y="124" width="166" height="17" rx="6" fill={BED_SHEET} />
      {/* Fluffy Pillow on Left */}
      <ellipse cx="52" cy="121" rx="18" ry="8" fill={PILLOW_CREAM} />
      {/* Cozy Folded Blanket at Foot of Bed */}
      <rect x="168" y="122" width="28" height="18" rx="6" fill={BED_BLANKET} />
    </g>
  );
}

export const MascotDuoIllustration: React.FC<{
  mood?: 'greeting' | 'proud' | 'eating';
  className?: string;
}> = ({ mood = 'greeting', className = 'w-36 h-24' }) => {
  const rawId = useId().replace(/:/g, '');
  const filterId = `dt-hero-${rawId}`;

  if (mood === 'eating') {
    return (
      <svg viewBox="0 0 185 118" className={className} aria-hidden="true">
        <CrayonFilterDef id={filterId} scale={2.3} />
        <ellipse cx="94" cy="106" rx="72" ry="7" fill="#D5AE46" opacity="0.35" />

        <DtBobo
          cx={36}
          cy={76}
          scale={0.78}
          filterId={filterId}
          armsUp={false}
          cheerLines={false}
          className="anim-breathe"
        />
        <rect
          x="23"
          y="78"
          width="11"
          height="13"
          rx="2.5"
          fill="#B67B50"
          filter={`url(#${filterId})`}
        />

        <g transform="translate(112, 62)" className="anim-breathe">
          <g filter={`url(#${filterId})`}>
            <ellipse cx="0" cy="24" rx="34" ry="20" fill={DENIM_OVERALL} />
            <ellipse cx="26" cy="28" rx="16" ry="12" fill={FUR} />
            <ellipse cx="-26" cy="36" rx="5" ry="10" transform="rotate(-18 -26 36)" fill={INK} />
            <ellipse cx="38" cy="34" rx="5" ry="10" transform="rotate(14 38 34)" fill={INK} />
            <polygon points="-8,8 6,8 4,26 -6,26" fill={RED_TEE} />
            <line x1="-1" y1="8" x2="-4" y2="-1" stroke={BOBO_WHITE} strokeWidth="2.4" strokeLinecap="round" />
            <ellipse cx="-14" cy="14" rx="9" ry="5.5" fill={FUR} />
            <circle cx="-6" cy="16" r="4" fill={INK} />
          </g>
          <DtQuokkaHead cx={-4} cy={-12} scale={0.95} filterId={filterId} mouth="smile" />
        </g>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 192 122" className={className} aria-hidden="true">
      <CrayonFilterDef id={filterId} scale={2.3} />
      <ellipse cx="52" cy="109" rx="36" ry="6" fill="#D5AC42" opacity="0.45" />
      <ellipse cx="146" cy="110" rx="30" ry="5.5" fill="#D5AC42" opacity="0.45" />

      <g transform="translate(48, 60)" className="anim-breathe">
        <g filter={`url(#${filterId})`}>
          <ellipse cx="0" cy="26" rx="25" ry="24" fill={mood === 'proud' ? RED_TEE : FUR} />
          {mood === 'proud' && <ellipse cx="0" cy="42" rx="22" ry="10" fill={FUR} />}
          <ellipse cx="-18" cy="41" rx="4.2" ry="11" transform="rotate(-18 -18 41)" fill={INK} />
          <ellipse cx="22" cy="40" rx="4.2" ry="11" transform="rotate(18 22 40)" fill={INK} />
          <ellipse cx="12" cy="19" rx="10" ry="6" fill={mood === 'proud' ? RED_TEE : FUR} />
          <circle cx="19" cy="19" r="4.2" fill={INK} />
        </g>
        <DtMarsh cx={25} cy={17} rotate={-10} filterId={filterId} />
        <DtQuokkaHead cx={0} cy={-11} scale={0.94} filterId={filterId} mouth="open" />
      </g>

      <g transform="translate(96, 0)">
        <DtMarsh cx={0} cy={103} rotate={2} filterId={filterId} />
        <DtMarsh cx={-1.5} cy={90} rotate={-4} filterId={filterId} />
        <DtMarsh cx={1} cy={77} rotate={4} filterId={filterId} />
        <DtMarsh cx={-1} cy={64} rotate={-3} filterId={filterId} />
      </g>

      <g filter={`url(#${filterId})`}>
        <rect x="122" y="88" width="44" height="6.5" rx="2.5" fill={WOOD_STOOL} />
        <rect x="128" y="93" width="6" height="17" rx="1.5" fill={WOOD_STOOL} />
        <rect x="154" y="93" width="6" height="17" rx="1.5" fill={WOOD_STOOL} />
      </g>
      <DtBobo
        cx={144}
        cy={58}
        scale={0.86}
        filterId={filterId}
        armsUp
        cheerLines
        className="anim-float-bob"
      />
    </svg>
  );
};

export const BoboWaterIllustration: React.FC<{ pct: number }> = ({ pct }) => {
  const rawId = useId().replace(/:/g, '');
  const filterId = `dt-water-${rawId}`;
  const waterHeight = Math.max(8, Math.min(54, Math.round((pct / 100) * 54)));
  const waterY = 74 - waterHeight;

  return (
    <svg viewBox="0 0 116 88" className="w-28 h-22 shrink-0" aria-hidden="true">
      <CrayonFilterDef id={filterId} scale={2.1} />
      <rect width="116" height="88" rx="18" fill="#DFDDD4" />
      <DtBobo
        cx={36}
        cy={50}
        scale={0.78}
        filterId={filterId}
        armsUp
        cheerLines
        className="anim-float-bob"
      />
      <g filter={`url(#${filterId})`}>
        <line x1="53" y1="50" x2="51" y2="42" stroke={BOBO_WHITE} strokeWidth="2.2" strokeLinecap="round" />
        <polygon points="47,50 58,50 56,65 49,65" fill={RED_TEE} />
      </g>
      <rect x="70" y="18" width="32" height="58" rx="8" fill="#F5F7F8" />
      <rect
        x="72"
        y={waterY}
        width="28"
        height={waterHeight}
        rx="6"
        fill="#7EB6D6"
        className="transition-all duration-500"
      />
      <DtMarsh cx={86} cy={Math.max(27, waterY - 2)} filterId={filterId} />
    </svg>
  );
};

export const MarshmallowStampBadge: React.FC<{ label?: string }> = ({ label }) => (
  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFECE3] text-[#4A3B2F] text-xs font-bold">
    <span className="inline-block w-3.5 h-3 rounded-[3px] bg-white shadow-sm border border-[#D4CEC0]" />
    <span>{label || 'Marsh 棉花糖印章'}</span>
  </div>
);

/**
 * 13 款 DINOTAENG 油畫棒無邊框風格 4分鐘運動舞台（手部線條 ＋ 床上躺練 ＋ 餐後消食）
 */
export const ExerciseAnimationStage: React.FC<{
  exerciseId: string;
  paused?: boolean;
  className?: string;
}> = ({ exerciseId, paused = false, className = 'w-full h-48' }) => {
  const rawId = useId().replace(/:/g, '');
  const filterId = `dt-ex-${rawId}`;
  const pauseClass = paused ? '[&_*]:![animation-play-state:paused]' : '';

  const renderPose = () => {
    switch (exerciseId) {
      // === 1. 手部線條專區 ===
      case 'swan_arm_circles':
        return (
          <>
            {/* Sitting on edge of bed/stool doing T-shape Swan Arm Circles! */}
            <g filter={`url(#${filterId})`}>
              <rect x="78" y="132" width="56" height="7" rx="3" fill={WOOD_STOOL} />
              <rect x="86" y="138" width="6" height="16" rx="2" fill={WOOD_STOOL} />
              <rect x="120" y="138" width="6" height="16" rx="2" fill={WOOD_STOOL} />
              {/* Quokka sitting upright in Red Tee */}
              <ellipse cx="106" cy="126" rx="20" ry="12" fill={FUR} />
              <ellipse cx="94" cy="146" rx="8" ry="4" fill={INK} />
              <ellipse cx="118" cy="146" rx="8" ry="4" fill={INK} />
              <ellipse cx="106" cy="104" rx="23" ry="21" fill={RED_TEE} />
            </g>
            {/* Left & Right Extended Arms Circling! */}
            <g className="anim-swan-l" filter={`url(#${filterId})`}>
              <line x1="86" y1="96" x2="50" y2="94" stroke={FUR} strokeWidth="9" strokeLinecap="round" />
              <circle cx="46" cy="94" r="4.8" fill={INK} />
              <circle cx="46" cy="94" r="11" fill="none" stroke={CHEER_CREAM} strokeWidth="1.6" strokeDasharray="3 3" />
            </g>
            <g className="anim-swan-r" filter={`url(#${filterId})`}>
              <line x1="126" y1="96" x2="162" y2="94" stroke={FUR} strokeWidth="9" strokeLinecap="round" />
              <circle cx="166" cy="94" r="4.8" fill={INK} />
              <circle cx="166" cy="94" r="11" fill="none" stroke={CHEER_CREAM} strokeWidth="1.6" strokeDasharray="3 3" />
            </g>
            <DtQuokkaHead cx={106} cy={66} scale={0.94} filterId={filterId} mouth="open" />
            <DtBobo
              cx={222}
              cy={122}
              scale={0.94}
              filterId={filterId}
              armsWide
              cheerLines
              className="anim-bobo-cheer"
            />
          </>
        );

      case 'bye_bye_arm_pulse':
        return (
          <>
            <ellipse cx="104" cy="152" rx="30" ry="5" fill="#B9B4A6" opacity="0.45" />
            {/* Side-profile Quokka leaning slightly forward pulsing straight arms behind back! */}
            <g filter={`url(#${filterId})`}>
              <rect x="94" y="122" width="11" height="26" rx="5" fill={FUR} />
              <rect x="108" y="122" width="11" height="26" rx="5" fill={FUR} />
              <ellipse cx="97" cy="149" rx="9" ry="4" fill={INK} />
              <ellipse cx="116" cy="149" rx="9" ry="4" fill={INK} />
              <ellipse
                cx="104"
                cy="101"
                rx="22"
                ry="22"
                transform="rotate(8 104 101)"
                fill={NAVY_SWEATER}
              />
            </g>
            {/* Straight arms pulsing upward behind torso! */}
            <g className="anim-tricep" filter={`url(#${filterId})`}>
              <line x1="114" y1="96" x2="154" y2="108" stroke={NAVY_SWEATER} strokeWidth="9.5" strokeLinecap="round" />
              <circle cx="157" cy="109" r="5" fill={INK} />
              <path d="M160 98 L166 90" stroke={CHEER_CREAM} strokeWidth="2.2" strokeLinecap="round" />
            </g>
            <DtQuokkaHead cx={100} cy={64} scale={0.92} filterId={filterId} mouth="open" />
            <DtBobo
              cx={220}
              cy={122}
              scale={0.94}
              filterId={filterId}
              armsUp
              cheerLines
              className="anim-bobo-cheer"
            />
          </>
        );

      case 'angel_wings_pull':
        return (
          <>
            <ellipse cx="106" cy="152" rx="30" ry="5" fill="#B9B4A6" opacity="0.45" />
            <g filter={`url(#${filterId})`}>
              <rect x="92" y="122" width="11" height="26" rx="5" fill={FUR} />
              <rect x="109" y="122" width="11" height="26" rx="5" fill={FUR} />
              <ellipse cx="95" cy="149" rx="8.5" ry="4" fill={INK} />
              <ellipse cx="117" cy="149" rx="8.5" ry="4" fill={INK} />
              <ellipse cx="106" cy="102" rx="23" ry="22" fill={OLIVE_VEST} />
            </g>
            {/* Y-to-W Angel Wings Arm Squeeze! */}
            <g className="anim-wing-l" filter={`url(#${filterId})`}>
              <path
                d="M88 96 L68 104 L62 80"
                fill="none"
                stroke={FUR}
                strokeWidth="8.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="62" cy="78" r="4.5" fill={INK} />
            </g>
            <g className="anim-wing-r" filter={`url(#${filterId})`}>
              <path
                d="M124 96 L144 104 L150 80"
                fill="none"
                stroke={FUR}
                strokeWidth="8.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="150" cy="78" r="4.5" fill={INK} />
            </g>
            <DtQuokkaHead cx={106} cy={65} scale={0.92} filterId={filterId} mouth="open" />
            <DtBobo
              cx={220}
              cy={122}
              scale={0.92}
              filterId={filterId}
              armsUp
              cheerLines
              className="anim-bobo-cheer"
            />
          </>
        );

      case 'prayer_chest_press':
        return (
          <>
            <ellipse cx="106" cy="152" rx="30" ry="5" fill="#B9B4A6" opacity="0.45" />
            <g filter={`url(#${filterId})`}>
              <rect x="92" y="122" width="11" height="26" rx="5" fill={FUR} />
              <rect x="109" y="122" width="11" height="26" rx="5" fill={FUR} />
              <ellipse cx="95" cy="149" rx="8.5" ry="4" fill={INK} />
              <ellipse cx="117" cy="149" rx="8.5" ry="4" fill={INK} />
              <ellipse cx="106" cy="102" rx="24" ry="22" fill={RED_TEE} />
            </g>
            <DtQuokkaHead cx={106} cy={65} scale={0.92} filterId={filterId} mouth="smile" />
            {/* Elbows out + palms pressed together moving up & down! */}
            <g className="anim-prayer" filter={`url(#${filterId})`}>
              <path
                d="M84 98 L72 102 L106 96 L140 102 L128 98"
                fill="none"
                stroke={FUR}
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <ellipse cx="106" cy="93" rx="5" ry="8" fill={INK} />
            </g>
            <DtBobo
              cx={218}
              cy={122}
              scale={0.92}
              filterId={filterId}
              armsUp={false}
              cheerLines
              className="anim-float-bob"
            />
          </>
        );

      // === 2. 床上懶人躺練專區 (全部躺在溫馨小木床與枕頭上！) ===
      case 'bed_air_bike':
        return (
          <>
            <CozyBedStage filterId={filterId} />
            <DtQuokkaHead cx={64} cy={107} scale={0.82} filterId={filterId} mouth="open" />
            <g filter={`url(#${filterId})`}>
              <ellipse cx="110" cy="116" rx="26" ry="13" fill={RED_TEE} />
            </g>
            {/* Pedaling legs in the air on bed! */}
            <g className="anim-bike-a" filter={`url(#${filterId})`}>
              <path
                d="M130 116 L146 92 L166 96"
                fill="none"
                stroke={FUR}
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <ellipse cx="169" cy="96" rx="4" ry="7.5" fill={INK} />
            </g>
            <g className="anim-bike-b" filter={`url(#${filterId})`}>
              <path
                d="M132 118 L156 106 L172 88"
                fill="none"
                stroke={FUR}
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <ellipse cx="174" cy="86" rx="4" ry="7.5" fill={INK} />
            </g>
            <DtBobo
              cx={232}
              cy={122}
              scale={0.88}
              filterId={filterId}
              armsUp
              cheerLines
              className="anim-bobo-cheer"
            />
          </>
        );

      case 'bed_clamshell_leg':
        return (
          <>
            <CozyBedStage filterId={filterId} />
            {/* Side-lying Quokka propped on pillow lifting top leg! */}
            <DtQuokkaHead cx={66} cy={104} scale={0.82} filterId={filterId} mouth="smile" />
            <g filter={`url(#${filterId})`}>
              <ellipse cx="108" cy="116" rx="25" ry="13" fill={NAVY_SWEATER} />
              {/* Bottom leg resting on mattress */}
              <line x1="128" y1="120" x2="168" y2="121" stroke={FUR} strokeWidth="8.5" strokeLinecap="round" />
              <ellipse cx="171" cy="121" rx="4" ry="7" fill={INK} />
            </g>
            {/* Top leg lifting up smoothly! */}
            <g className="anim-bed-sideleg" filter={`url(#${filterId})`}>
              <line x1="124" y1="115" x2="168" y2="112" stroke={FUR} strokeWidth="8.5" strokeLinecap="round" />
              <ellipse cx="171" cy="111" rx="4" ry="7" fill={INK} />
            </g>
            <DtBobo
              cx={232}
              cy={122}
              scale={0.88}
              filterId={filterId}
              armsUp
              cheerLines
              className="anim-bobo-cheer"
            />
          </>
        );

      case 'bed_glute_bridge':
        return (
          <>
            <CozyBedStage filterId={filterId} />
            <DtQuokkaHead cx={64} cy={108} scale={0.82} filterId={filterId} mouth="smile" />
            <g className="anim-bridge" filter={`url(#${filterId})`}>
              <ellipse cx="110" cy="111" rx="25" ry="14" fill={RED_TEE} />
              <path
                d="M132 108 L150 92 L166 123"
                fill="none"
                stroke={FUR}
                strokeWidth="9.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <ellipse cx="168" cy="124" rx="7.5" ry="3.8" fill={INK} />
            </g>
            <DtBobo
              cx={232}
              cy={122}
              scale={0.88}
              filterId={filterId}
              armsUp
              cheerLines
              className="anim-bobo-cheer"
            />
          </>
        );

      case 'bed_dead_bug':
        return (
          <>
            <CozyBedStage filterId={filterId} />
            <DtQuokkaHead cx={64} cy={108} scale={0.82} filterId={filterId} mouth="smile" />
            <g filter={`url(#${filterId})`}>
              <ellipse cx="112" cy="116" rx="25" ry="13" fill={OLIVE_VEST} />
              <line x1="100" y1="106" x2="96" y2="80" stroke={FUR} strokeWidth="6.5" strokeLinecap="round" />
              <circle cx="96" cy="78" r="4" fill={INK} />
              <line x1="112" y1="106" x2="116" y2="82" stroke={FUR} strokeWidth="6.5" strokeLinecap="round" />
              <circle cx="116" cy="80" r="4" fill={INK} />
            </g>
            <g className="anim-deadbug-l" filter={`url(#${filterId})`}>
              <path
                d="M130 115 L140 88 L162 88"
                fill="none"
                stroke={FUR}
                strokeWidth="7.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <ellipse cx="165" cy="88" rx="4" ry="7" fill={INK} />
            </g>
            <g className="anim-deadbug-r" filter={`url(#${filterId})`}>
              <line x1="134" y1="118" x2="168" y2="110" stroke={FUR} strokeWidth="7.5" strokeLinecap="round" />
              <ellipse cx="171" cy="109" rx="4" ry="7" fill={INK} />
            </g>
            <DtBobo
              cx={232}
              cy={122}
              scale={0.88}
              filterId={filterId}
              armsUp={false}
              cheerLines={false}
              className="anim-float-bob"
            />
          </>
        );

      case 'bed_spinal_twist':
        return (
          <>
            <CozyBedStage filterId={filterId} />
            <g className="anim-breathe">
              <DtQuokkaHead cx={66} cy={107} scale={0.82} filterId={filterId} mouth="smile" />
              <g filter={`url(#${filterId})`}>
                <ellipse cx="112" cy="116" rx="25" ry="13.5" fill={FUR} />
                <path
                  d="M128 112 Q146 92 158 122"
                  fill="none"
                  stroke={FUR}
                  strokeWidth="8.5"
                  strokeLinecap="round"
                />
                <ellipse cx="159" cy="123" rx="6.5" ry="3.8" fill={INK} />
              </g>
              <DtMarsh cx={114} cy={78} rotate={-8} filterId={filterId} />
            </g>
            <DtBobo
              cx={232}
              cy={122}
              scale={0.88}
              filterId={filterId}
              armsUp={false}
              cheerLines={false}
              className="anim-breathe"
            />
          </>
        );

      // === 3. 餐後消食＆居家靜音 ===
      case 'slow_jogging_180':
        return (
          <>
            <text x="34" y="44" fontSize="16" fill={INK} fontWeight="900">
              ♪~ 180 BPM
            </text>
            <ellipse cx="102" cy="152" rx="28" ry="5" fill="#B9B4A6" opacity="0.45" />
            <ellipse cx="198" cy="152" rx="22" ry="4.5" fill="#B9B4A6" opacity="0.45" />

            <g className="anim-slow-jog">
              <g filter={`url(#${filterId})`}>
                <line x1="94" y1="122" x2="89" y2="147" stroke={FUR} strokeWidth="9.5" strokeLinecap="round" />
                <ellipse cx="88" cy="149" rx="8" ry="3.8" fill={INK} />
                <line x1="112" y1="122" x2="120" y2="142" stroke={FUR} strokeWidth="9.5" strokeLinecap="round" />
                <ellipse cx="122" cy="144" rx="8" ry="3.8" fill={INK} />
                <ellipse cx="102" cy="101" rx="23" ry="21" fill={DENIM_OVERALL} />
                <ellipse cx="82" cy="102" rx="8" ry="5" fill={FUR} />
                <circle cx="76" cy="102" r="4" fill={INK} />
                <ellipse cx="122" cy="102" rx="8" ry="5" fill={FUR} />
                <circle cx="128" cy="102" r="4" fill={INK} />
              </g>
              <DtQuokkaHead cx={102} cy={65} scale={0.92} filterId={filterId} mouth="open" />
            </g>

            <DtBobo
              cx={198}
              cy={120}
              scale={0.95}
              filterId={filterId}
              armsUp
              cheerLines
              redBag
              className="anim-slow-jog"
            />
          </>
        );

      case 'wall_stand':
        return (
          <>
            <rect
              x="50"
              y="22"
              width="13"
              height="132"
              rx="4"
              fill={WOOD_STOOL}
              filter={`url(#${filterId})`}
            />
            <circle cx="64" cy="64" r="3.5" fill="#F3C85F" />
            <circle cx="64" cy="100" r="3.5" fill="#F3C85F" />
            <circle cx="64" cy="146" r="3.5" fill="#F3C85F" />

            <g className="anim-breathe">
              <g filter={`url(#${filterId})`}>
                <rect x="82" y="120" width="18" height="28" rx="6" fill={FUR} />
                <ellipse cx="94" cy="149" rx="11" ry="4" fill={INK} />
                <ellipse cx="90" cy="101" rx="21" ry="22" fill={OLIVE_VEST} />
              </g>
              <DtQuokkaHead cx={90} cy={64} scale={0.92} filterId={filterId} mouth="smile" />
            </g>
            <DtBobo
              cx={202}
              cy={122}
              scale={0.95}
              filterId={filterId}
              armsUp={false}
              cheerLines
              className="anim-breathe"
            />
          </>
        );

      case 'slow_squat':
        return (
          <>
            <g filter={`url(#${filterId})`} opacity="0.55">
              <rect x="64" y="128" width="32" height="5" rx="2" fill={WOOD_STOOL} />
              <rect x="68" y="132" width="5" height="18" rx="2" fill={WOOD_STOOL} />
              <rect x="87" y="132" width="5" height="18" rx="2" fill={WOOD_STOOL} />
            </g>
            <ellipse cx="106" cy="152" rx="34" ry="5.5" fill="#B9B4A6" className="anim-shadow" />
            <g className="anim-squat">
              <g filter={`url(#${filterId})`}>
                <rect x="89" y="120" width="11" height="26" rx="5" fill={FUR} />
                <rect x="112" y="120" width="11" height="26" rx="5" fill={FUR} />
                <ellipse cx="92" cy="148" rx="9" ry="4" fill={INK} />
                <ellipse cx="119" cy="148" rx="9" ry="4" fill={INK} />
                <ellipse cx="106" cy="102" rx="24" ry="22" fill={RED_TEE} />
                <ellipse cx="106" cy="118" rx="21" ry="9" fill={FUR} />
                <line x1="120" y1="96" x2="152" y2="94" stroke={RED_TEE} strokeWidth="9" strokeLinecap="round" />
                <circle cx="155" cy="94" r="4.5" fill={INK} />
              </g>
              <DtQuokkaHead cx={106} cy={66} scale={0.94} filterId={filterId} mouth="open" />
            </g>
            <DtBobo
              cx={218}
              cy={122}
              scale={0.95}
              filterId={filterId}
              armsUp
              cheerLines
              className="anim-bobo-cheer"
            />
          </>
        );

      case 'cat_cow':
      default:
        return (
          <>
            <CozyBedStage filterId={filterId} />
            <g filter={`url(#${filterId})`}>
              <line x1="82" y1="100" x2="82" y2="124" stroke={FUR} strokeWidth="7.5" strokeLinecap="round" />
              <ellipse cx="80" cy="125" rx="5.5" ry="3.5" fill={INK} />
              <line x1="134" y1="100" x2="134" y2="124" stroke={FUR} strokeWidth="7.5" strokeLinecap="round" />
              <ellipse cx="136" cy="125" rx="5.5" ry="3.5" fill={INK} />
            </g>
            <g className="anim-cat-cow" filter={`url(#${filterId})`}>
              <ellipse cx="108" cy="92" rx="30" ry="15.5" fill={RED_TEE} />
            </g>
            <DtQuokkaHead cx={70} cy={80} scale={0.84} filterId={filterId} mouth="smile" />
            <DtBobo
              cx={232}
              cy={122}
              scale={0.88}
              filterId={filterId}
              armsUp={false}
              cheerLines
              className="anim-breathe"
            />
          </>
        );
    }
  };

  return (
    <div
      className={`relative rounded-2xl bg-[#DFDDD4] overflow-hidden flex items-center justify-center ${pauseClass} ${className}`}
    >
      <svg viewBox="0 0 280 172" className="w-full h-full max-w-[320px]">
        <CrayonFilterDef id={filterId} scale={2.3} />
        <circle cx="248" cy="28" r="13" fill="#F3C85F" filter={`url(#${filterId})`} />
        {renderPose()}
      </svg>
      {paused && (
        <div className="absolute inset-0 bg-[#2C241E]/20 backdrop-blur-[1px] flex items-center justify-center">
          <span className="px-4 py-1.5 rounded-full bg-[#FAF8F3] text-xs font-bold text-[#2C241E] shadow">
            ⏸ 休息暫停中～喘口氣沒關係喔
          </span>
        </div>
      )}
    </div>
  );
};
