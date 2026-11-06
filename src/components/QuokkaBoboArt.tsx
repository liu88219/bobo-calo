import React from 'react';

const INK = '#422B1D';
const QUOKKA = '#BA7E4D';
const QUOKKA_BELLY = '#DFB089';
const BOBO = '#FFFDF9';
const BLUSH = '#F4978E';
const SAGE = '#8FBC8B';
const MAT = '#D7E7D4';
const MAT_BORDER = '#8FB08A';

function QuokkaHead({
  cx,
  cy,
  scale = 1,
  sweatband = true,
  sweatDrop = false,
}: {
  cx: number;
  cy: number;
  scale?: number;
  sweatband?: boolean;
  sweatDrop?: boolean;
}) {
  return (
    <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>
      {/* Round Ears */}
      <circle cx="-17" cy="-19" r="9.5" fill={QUOKKA} stroke={INK} strokeWidth="2.8" />
      <circle cx="-17" cy="-19" r="4.8" fill={QUOKKA_BELLY} />
      <circle cx="17" cy="-19" r="9.5" fill={QUOKKA} stroke={INK} strokeWidth="2.8" />
      <circle cx="17" cy="-19" r="4.8" fill={QUOKKA_BELLY} />
      {/* Chubby Cheeks Head */}
      <ellipse cx="0" cy="0" rx="25" ry="22" fill={QUOKKA} stroke={INK} strokeWidth="2.8" />
      {/* Sage Sweatband */}
      {sweatband && (
        <path
          d="M-22 -9 Q0 -15 22 -9"
          fill="none"
          stroke={SAGE}
          strokeWidth="6.5"
          strokeLinecap="round"
        />
      )}
      {sweatband && (
        <path
          d="M-22 -9 Q0 -15 22 -9"
          fill="none"
          stroke={INK}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.75"
        />
      )}
      {/* Eyes */}
      <circle cx="-9" cy="-1" r="2.5" fill={INK} />
      <circle cx="9" cy="-1" r="2.5" fill={INK} />
      {/* Rosy Cheeks */}
      <ellipse cx="-15" cy="5" rx="4.8" ry="3" fill={BLUSH} opacity="0.85" />
      <ellipse cx="15" cy="5" rx="4.8" ry="3" fill={BLUSH} opacity="0.85" />
      {/* Nose & Signature Quokka W-Smile */}
      <ellipse cx="0" cy="2.5" rx="3.6" ry="2.6" fill={INK} />
      <path
        d="M-6.5 6.5 Q-3.2 11 0 6 Q3.2 11 6.5 6.5"
        fill="none"
        stroke={INK}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {sweatDrop && (
        <path
          d="M21 -14 Q25 -8 23 -5 A2.6 2.6 0 1 1 19 -5 Q18 -8 21 -14 Z"
          fill="#7FB5D5"
          stroke={INK}
          strokeWidth="1.5"
        />
      )}
    </g>
  );
}

function BoboBuddy({
  cx,
  cy,
  scale = 1,
  pomPoms = false,
  className = '',
}: {
  cx: number;
  cy: number;
  scale?: number;
  pomPoms?: boolean;
  className?: string;
}) {
  return (
    <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>
      <g className={className}>
        {/* Ears */}
        <circle cx="-11" cy="-22" r="6.5" fill={BOBO} stroke={INK} strokeWidth="2.6" />
        <circle cx="11" cy="-22" r="6.5" fill={BOBO} stroke={INK} strokeWidth="2.6" />
        {/* Soft Marshmallow Body */}
        <ellipse cx="0" cy="0" rx="19" ry="21" fill={BOBO} stroke={INK} strokeWidth="2.6" />
        {/* Arms */}
        <path
          d={pomPoms ? 'M-16 -2 Q-25 -12 -22 -17' : 'M-16 2 Q-23 8 -18 12'}
          fill="none"
          stroke={INK}
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path
          d={pomPoms ? 'M16 -2 Q25 -12 22 -17' : 'M16 2 Q23 8 18 12'}
          fill="none"
          stroke={INK}
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        {pomPoms && (
          <>
            <circle cx="-23" cy="-18" r="6" fill="#F4B860" stroke={INK} strokeWidth="2" />
            <circle cx="23" cy="-18" r="6" fill="#F4978E" stroke={INK} strokeWidth="2" />
          </>
        )}
        {/* Feet */}
        <ellipse cx="-8" cy="20" rx="5" ry="3.5" fill={BOBO} stroke={INK} strokeWidth="2.4" />
        <ellipse cx="8" cy="20" rx="5" ry="3.5" fill={BOBO} stroke={INK} strokeWidth="2.4" />
        {/* Face */}
        <circle cx="-6.5" cy="-4" r="2.1" fill={INK} />
        <circle cx="6.5" cy="-4" r="2.1" fill={INK} />
        <ellipse cx="-11.5" cy="0.5" rx="3.8" ry="2.2" fill={BLUSH} opacity="0.85" />
        <ellipse cx="11.5" cy="0.5" rx="3.8" ry="2.2" fill={BLUSH} opacity="0.85" />
        <path
          d="M-2.8 0.5 Q0 3.5 2.8 0.5"
          fill="none"
          stroke={INK}
          strokeWidth="2.1"
          strokeLinecap="round"
        />
      </g>
    </g>
  );
}

export const MascotDuoIllustration: React.FC<{
  mood?: 'greeting' | 'proud' | 'eating';
  className?: string;
}> = ({ mood = 'greeting', className = 'w-28 h-20' }) => {
  return (
    <svg viewBox="0 0 150 105" className={className} aria-hidden="true">
      {/* Soft ground shadow */}
      <ellipse cx="75" cy="95" rx="56" ry="7" fill="#E5CFB3" opacity="0.55" />
      {/* Sparkles */}
      <path d="M18 22 L20 28 L26 30 L20 32 L18 38 L16 32 L10 30 L16 28 Z" fill="#F4B860" />
      <circle cx="132" cy="24" r="3.5" fill="#F4978E" />

      {/* Bobo right side */}
      <BoboBuddy
        cx={108}
        cy={66}
        scale={0.92}
        pomPoms={mood === 'proud'}
        className="anim-float-bob"
      />

      {/* Quokka left side */}
      <g transform="translate(54, 52)" className="anim-breathe">
        <ellipse cx="0" cy="26" rx="20" ry="18" fill={QUOKKA} stroke={INK} strokeWidth="2.8" />
        <ellipse cx="0" cy="27" rx="11" ry="11" fill={QUOKKA_BELLY} />
        {/* Paws */}
        <ellipse cx="-16" cy="23" rx="6" ry="4" fill={QUOKKA} stroke={INK} strokeWidth="2.5" />
        <ellipse cx="16" cy="23" rx="6" ry="4" fill={QUOKKA} stroke={INK} strokeWidth="2.5" />
        {/* Marshmallow stick when proud/eating */}
        {mood !== 'greeting' && (
          <g transform="translate(22, 8) rotate(18)">
            <line x1="0" y1="18" x2="0" y2="-10" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
            <rect x="-5" y="-12" width="10" height="9" rx="3" fill="#FFFDF9" stroke={INK} strokeWidth="2" />
            <rect x="-5" y="-2" width="10" height="9" rx="3" fill="#F9D5A7" stroke={INK} strokeWidth="2" />
          </g>
        )}
        <QuokkaHead cx={0} cy={-4} scale={0.92} sweatband={mood === 'proud'} />
      </g>
    </svg>
  );
};

export const MarshmallowStampBadge: React.FC<{ label?: string }> = ({ label }) => (
  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF3DF] border-2 border-[#E6B87D] text-[#6D441B] text-xs font-bold shadow-sm">
    <span>🍡</span>
    <span>{label || '棉花糖努力印章'}</span>
  </div>
);

/**
 * 11 款專屬運動動作動態教學插畫舞台 (矮袋鼠親身示範 + Bobo 陪練加油)
 */
export const ExerciseAnimationStage: React.FC<{
  exerciseId: string;
  paused?: boolean;
  className?: string;
}> = ({ exerciseId, paused = false, className = 'w-full h-48' }) => {
  const pauseClass = paused ? '[&_*]:![animation-play-state:paused]' : '';

  const renderPose = () => {
    switch (exerciseId) {
      case 'slow_squat':
        return (
          <>
            {/* Invisible little chair reference */}
            <rect
              x="76"
              y="124"
              width="28"
              height="26"
              rx="5"
              fill="none"
              stroke="#C9B093"
              strokeWidth="2"
              strokeDasharray="4 3"
            />
            <ellipse cx="108" cy="154" rx="34" ry="6" fill="#B59B7E" className="anim-shadow" />
            <g className="anim-squat">
              {/* Legs */}
              <path d="M95 118 L90 148" stroke={INK} strokeWidth="8" strokeLinecap="round" />
              <path d="M121 118 L126 148" stroke={INK} strokeWidth="8" strokeLinecap="round" />
              {/* Body */}
              <ellipse cx="108" cy="100" rx="22" ry="23" fill={QUOKKA} stroke={INK} strokeWidth="2.8" />
              <ellipse cx="108" cy="103" rx="12" ry="13" fill={QUOKKA_BELLY} />
              {/* Arms forward for squat balance */}
              <path d="M122 96 L146 92" stroke={QUOKKA} strokeWidth="8" strokeLinecap="round" />
              <path d="M122 96 L146 92" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
              <QuokkaHead cx={108} cy={65} scale={0.92} sweatband />
            </g>
            <BoboBuddy cx={212} cy={126} scale={0.95} pomPoms className="anim-bobo-cheer" />
          </>
        );

      case 'standing_knee_crunch':
        return (
          <>
            <ellipse cx="108" cy="154" rx="30" ry="6" fill="#B59B7E" opacity="0.3" />
            {/* Standing left leg */}
            <path d="M98 118 L98 150" stroke={INK} strokeWidth="8" strokeLinecap="round" />
            {/* Body */}
            <ellipse cx="108" cy="100" rx="21" ry="23" fill={QUOKKA} stroke={INK} strokeWidth="2.8" />
            <ellipse cx="108" cy="103" rx="12" ry="13" fill={QUOKKA_BELLY} />
            {/* Lifting right knee! */}
            <g className="anim-knee-crunch">
              <path
                d="M116 122 L134 112 L130 136"
                fill="none"
                stroke={INK}
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
            {/* Hands by ears */}
            <path d="M88 88 Q74 72 86 64" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
            <path d="M128 88 Q142 72 130 64" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
            <QuokkaHead cx={108} cy={64} scale={0.9} sweatband />
            <BoboBuddy cx={212} cy={126} scale={0.92} pomPoms className="anim-bobo-cheer" />
          </>
        );

      case 'glute_bridge':
        return (
          <>
            {/* Yoga Mat */}
            <rect x="34" y="144" width="166" height="10" rx="5" fill={MAT} stroke={MAT_BORDER} strokeWidth="2" />
            {/* Supine Quokka lifting hips */}
            <QuokkaHead cx={66} cy={126} scale={0.82} sweatband />
            <g className="anim-bridge">
              {/* Torso & Hips lifting toward knees */}
              <ellipse cx="114" cy="128" rx="26" ry="15" fill={QUOKKA} stroke={INK} strokeWidth="2.8" />
              <ellipse cx="114" cy="124" rx="15" ry="7" fill={QUOKKA_BELLY} />
              {/* Bent knees planted on mat */}
              <path
                d="M136 125 L156 106 L172 143"
                fill="none"
                stroke={INK}
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
            <BoboBuddy cx={226} cy={126} scale={0.88} pomPoms className="anim-bobo-cheer" />
          </>
        );

      case 'plank_hold':
        return (
          <>
            <rect x="30" y="144" width="174" height="10" rx="5" fill={MAT} stroke={MAT_BORDER} strokeWidth="2" />
            <g className="anim-plank">
              {/* Straight core body */}
              <path d="M62 140 L124 118" stroke={INK} strokeWidth="9" strokeLinecap="round" />
              <ellipse
                cx="126"
                cy="116"
                rx="28"
                ry="14"
                transform="rotate(-10 126 116)"
                fill={QUOKKA}
                stroke={INK}
                strokeWidth="2.8"
              />
              {/* Forearm planted */}
              <path
                d="M144 116 L144 142 L162 142"
                fill="none"
                stroke={INK}
                strokeWidth="6.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <QuokkaHead cx={162} cy={98} scale={0.84} sweatband sweatDrop />
            </g>
            <BoboBuddy cx={228} cy={126} scale={0.88} pomPoms className="anim-bobo-cheer" />
          </>
        );

      case 'dead_bug':
        return (
          <>
            <rect x="34" y="144" width="168" height="10" rx="5" fill={MAT} stroke={MAT_BORDER} strokeWidth="2" />
            <QuokkaHead cx={68} cy={125} scale={0.82} sweatband />
            {/* Flat back on mat */}
            <ellipse cx="116" cy="133" rx="26" ry="13" fill={QUOKKA} stroke={INK} strokeWidth="2.8" />
            {/* Arms reaching to ceiling */}
            <path d="M104 123 L100 94" stroke={INK} strokeWidth="5.5" strokeLinecap="round" />
            <path d="M114 123 L118 96" stroke={INK} strokeWidth="5.5" strokeLinecap="round" />
            {/* Alternating 90-deg legs */}
            <g className="anim-deadbug-l">
              <path
                d="M134 132 L144 104 L166 104"
                fill="none"
                stroke={INK}
                strokeWidth="6.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
            <g className="anim-deadbug-r">
              <path
                d="M138 135 L174 126"
                fill="none"
                stroke={QUOKKA}
                strokeWidth="7"
                strokeLinecap="round"
              />
              <path
                d="M138 135 L174 126"
                fill="none"
                stroke={INK}
                strokeWidth="5.5"
                strokeLinecap="round"
              />
            </g>
            <BoboBuddy cx={228} cy={126} scale={0.88} className="anim-float-bob" />
          </>
        );

      case 'side_leg_raise':
        return (
          <>
            <ellipse cx="108" cy="154" rx="28" ry="6" fill="#B59B7E" opacity="0.3" />
            {/* Standing support leg */}
            <path d="M100 120 L100 150" stroke={INK} strokeWidth="8" strokeLinecap="round" />
            {/* Side lifting leg */}
            <g className="anim-side-leg">
              <path d="M118 124 L132 150" stroke={INK} strokeWidth="8" strokeLinecap="round" />
            </g>
            <ellipse cx="108" cy="100" rx="21" ry="23" fill={QUOKKA} stroke={INK} strokeWidth="2.8" />
            <ellipse cx="108" cy="103" rx="12" ry="13" fill={QUOKKA_BELLY} />
            <QuokkaHead cx={108} cy={64} scale={0.9} sweatband />
            <BoboBuddy cx={214} cy={126} scale={0.9} pomPoms className="anim-bobo-cheer" />
          </>
        );

      case 'slow_jogging_180':
        return (
          <>
            {/* 180 BPM Musical Rhythm Notes */}
            <text x="38" y="46" fontSize="18" fill="#BA7E4D" fontWeight="bold">
              ♪ 180 BPM
            </text>
            <text x="224" y="48" fontSize="18" fill="#8FBC8B" fontWeight="bold">
              ♫
            </text>
            <ellipse cx="104" cy="154" rx="28" ry="5" fill="#B59B7E" opacity="0.3" />
            <ellipse cx="198" cy="154" rx="22" ry="5" fill="#B59B7E" opacity="0.3" />
            <g className="anim-slow-jog">
              {/* Forefoot light jogging legs */}
              <path d="M96 122 L90 147" stroke={INK} strokeWidth="7.5" strokeLinecap="round" />
              <path d="M114 122 L122 142" stroke={INK} strokeWidth="7.5" strokeLinecap="round" />
              <ellipse cx="104" cy="100" rx="21" ry="22" fill={QUOKKA} stroke={INK} strokeWidth="2.8" />
              <ellipse cx="104" cy="103" rx="12" ry="12" fill={QUOKKA_BELLY} />
              {/* Relaxed bent elbows */}
              <path d="M85 96 L96 106" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
              <path d="M123 96 L114 106" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
              <QuokkaHead cx={104} cy={64} scale={0.9} sweatband />
            </g>
            {/* Bobo jogging right alongside at 180 BPM! */}
            <BoboBuddy cx={198} cy={124} scale={0.95} className="anim-slow-jog" />
          </>
        );

      case 'wall_stand':
        return (
          <>
            {/* Cozy Cream Wall */}
            <rect x="52" y="24" width="14" height="132" rx="4" fill="#E6D2B8" stroke={INK} strokeWidth="2.4" />
            {/* Alignment glow points */}
            <circle cx="66" cy="62" r="4" fill="#F4978E" />
            <circle cx="66" cy="96" r="4" fill="#F4978E" />
            <circle cx="66" cy="146" r="4" fill="#F4978E" />
            <g className="anim-breathe">
              <path d="M84 120 L84 150" stroke={INK} strokeWidth="8" strokeLinecap="round" />
              <path d="M98 120 L98 150" stroke={INK} strokeWidth="8" strokeLinecap="round" />
              <ellipse cx="90" cy="100" rx="20" ry="23" fill={QUOKKA} stroke={INK} strokeWidth="2.8" />
              <ellipse cx="94" cy="102" rx="11" ry="13" fill={QUOKKA_BELLY} />
              <QuokkaHead cx={90} cy={62} scale={0.9} sweatband={false} />
            </g>
            <BoboBuddy cx={198} cy={126} scale={0.94} className="anim-breathe" />
          </>
        );

      case 'cat_cow':
        return (
          <>
            <rect x="36" y="144" width="168" height="10" rx="5" fill={MAT} stroke={MAT_BORDER} strokeWidth="2" />
            {/* Hands & Knees on mat */}
            <path d="M86 116 L86 144" stroke={INK} strokeWidth="6.5" strokeLinecap="round" />
            <path d="M138 116 L138 144" stroke={INK} strokeWidth="6.5" strokeLinecap="round" />
            <g className="anim-cat-cow">
              <ellipse cx="112" cy="108" rx="30" ry="16" fill={QUOKKA} stroke={INK} strokeWidth="2.8" />
            </g>
            <QuokkaHead cx={74} cy={95} scale={0.82} sweatband={false} />
            <BoboBuddy cx={224} cy={126} scale={0.88} className="anim-breathe" />
          </>
        );

      case 'downward_dog':
        return (
          <>
            <rect x="34" y="144" width="172" height="10" rx="5" fill={MAT} stroke={MAT_BORDER} strokeWidth="2" />
            <g className="anim-breathe">
              {/* Inverted V pose */}
              <path
                d="M68 143 L118 86 L166 143"
                fill="none"
                stroke={QUOKKA}
                strokeWidth="18"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M68 143 L118 86 L166 143"
                fill="none"
                stroke={INK}
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <QuokkaHead cx={92} cy={115} scale={0.74} sweatband />
            </g>
            <BoboBuddy cx={226} cy={126} scale={0.88} pomPoms className="anim-float-bob" />
          </>
        );

      case 'spinal_twist':
      default:
        return (
          <>
            <rect x="34" y="144" width="170" height="10" rx="5" fill={MAT} stroke={MAT_BORDER} strokeWidth="2" />
            <g className="anim-breathe">
              <QuokkaHead cx={72} cy={124} scale={0.82} sweatband={false} />
              <ellipse cx="118" cy="132" rx="26" ry="14" fill={QUOKKA} stroke={INK} strokeWidth="2.8" />
              {/* Bent knee twisted gently */}
              <path
                d="M134 128 Q152 108 164 138"
                fill="none"
                stroke={INK}
                strokeWidth="7.5"
                strokeLinecap="round"
              />
              {/* Floating calm heart */}
              <text x="114" y="88" fontSize="16">
                🤎✨
              </text>
            </g>
            <BoboBuddy cx={226} cy={126} scale={0.88} className="anim-breathe" />
          </>
        );
    }
  };

  return (
    <div
      className={`relative rounded-2xl bg-gradient-to-b from-[#FFF9F0] to-[#F5E8D5] border-2 border-[#E2CCB0] overflow-hidden flex items-center justify-center ${pauseClass} ${className}`}
    >
      <svg viewBox="0 0 280 172" className="w-full h-full max-w-[320px]">
        {/* Warm window sunbeam deco */}
        <circle cx="248" cy="30" r="14" fill="#FBE3B5" opacity="0.65" />
        <path d="M22 30 L24 35 L29 37 L24 39 L22 44 L20 39 L15 37 L20 35 Z" fill="#F4B860" opacity="0.8" />
        {renderPose()}
      </svg>
      {paused && (
        <div className="absolute inset-0 bg-[#422B1D]/15 backdrop-blur-[1px] flex items-center justify-center">
          <span className="px-4 py-1.5 rounded-full bg-[#FFFDF9] border-2 border-[#422B1D] text-sm font-bold">
            ⏸ 休息暫停中～喘口氣沒關係喔
          </span>
        </div>
      )}
    </div>
  );
};
