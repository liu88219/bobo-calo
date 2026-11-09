import React, { useEffect, useMemo, useState } from 'react';
import {
  Pause,
  Play,
  SkipForward,
  Volume2,
  VolumeX,
  X,
  Plus,
  Music,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import {
  WorkoutPlaylistItem,
  calculateExerciseCalories,
} from '../types/tracker';
import { getExerciseById } from '../data/exercises';
import { pickWorkoutPraise } from '../data/praiseMessages';
import { BgmStyle, soundEngine } from '../services/soundEffects';
import {
  ExerciseAnimationStage,
  MascotDuoIllustration,
  MarshmallowStampBadge,
} from './QuokkaBoboArt';

interface Props {
  playlist: WorkoutPlaylistItem[];
  weightKg: number;
  sourceMealId?: string;
  onCompleteWorkout: (
    completedItems: Array<{
      exerciseId: string;
      exerciseName: string;
      durationSec: number;
      caloriesBurned: number;
      sourceMealId?: string;
      planItemId?: string;
    }>
  ) => void;
  onClose: () => void;
}

type Phase = 'ready' | 'active' | 'rest' | 'finished';

const UNILATERAL_IDS = new Set([
  'swan_arm_circles',
  'bed_clamshell_leg',
  'bed_spinal_twist',
]);

export const WorkoutPlayerModal: React.FC<Props> = ({
  playlist,
  weightKg,
  sourceMealId,
  onCompleteWorkout,
  onClose,
}) => {
  const [stepIdx, setStepIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('ready');
  const [secondsLeft, setSecondsLeft] = useState(3);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(soundEngine.muted);
  const [bgmStyle, setBgmStyle] = useState<BgmStyle>(soundEngine.bgmStyle);
  const [metronomeOn, setMetronomeOn] = useState(false);
  const [completedLog, setCompletedLog] = useState<
    Array<{
      exerciseId: string;
      exerciseName: string;
      durationSec: number;
      caloriesBurned: number;
      sourceMealId?: string;
      planItemId?: string;
    }>
  >([]);
  const [praiseText] = useState(() => pickWorkoutPraise());

  const currentItem = playlist[stepIdx] || playlist[0];
  const currentDef = useMemo(
    () => getExerciseById(currentItem.exerciseId),
    [currentItem.exerciseId]
  );

  // Sync metronome automatically when entering slow_jogging_180
  useEffect(() => {
    if (phase === 'active' && !paused && currentDef.hasMetronome180) {
      setMetronomeOn(true);
    } else if (phase !== 'active') {
      setMetronomeOn(false);
    }
  }, [phase, currentDef.hasMetronome180, stepIdx]);

  useEffect(() => {
    if (phase === 'active' && !paused && metronomeOn && !muted) {
      soundEngine.start180Metronome();
    } else {
      soundEngine.stop180Metronome();
    }
    return () => {
      soundEngine.stop180Metronome();
    };
  }, [phase, paused, metronomeOn, muted]);

  // Sync background music (BGM) during active & rest countdowns
  useEffect(() => {
    const shouldPlayBgm =
      (phase === 'active' || phase === 'rest') && !paused && !muted && bgmStyle !== 'off';
    const shouldDuck = phase === 'rest' || (phase === 'active' && metronomeOn);
    if (shouldPlayBgm) {
      soundEngine.startBgm(bgmStyle, shouldDuck);
      soundEngine.setBgmDucked(shouldDuck);
    } else {
      soundEngine.stopBgm();
    }
    return () => {
      soundEngine.stopBgm();
    };
  }, [phase, paused, muted, bgmStyle, metronomeOn]);

  useEffect(() => {
    soundEngine.unlock();
    return () => {
      soundEngine.stop180Metronome();
      soundEngine.stopBgm();
    };
  }, []);

  const recordCurrentStepFinished = () => {
    const kcal = calculateExerciseCalories(currentDef.met, weightKg, currentItem.durationSec);
    const entry = {
      exerciseId: currentDef.id,
      exerciseName: currentDef.name,
      durationSec: currentItem.durationSec,
      caloriesBurned: kcal,
      sourceMealId,
      planItemId: currentItem.planItemId,
    };
    setCompletedLog((prev) => [...prev, entry]);
    return entry;
  };

  useEffect(() => {
    if (paused || phase === 'finished') return;

    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) {
          const next = prev - 1;
          if (phase === 'ready') {
            soundEngine.playCountdownBeep();
          } else if (phase === 'active') {
            const half = Math.floor(currentItem.durationSec / 2);
            if (UNILATERAL_IDS.has(currentDef.id) && next === half && half >= 10) {
              soundEngine.playHalfwayBell();
            } else if (next <= 3) {
              soundEngine.playCountdownBeep();
            }
          } else if (phase === 'rest' && next <= 3) {
            soundEngine.playCountdownBeep();
          }
          return next;
        }

        // prev <= 1: transition to next phase!
        if (phase === 'ready') {
          soundEngine.playStartGo();
          setPhase('active');
          return currentItem.durationSec;
        }

        if (phase === 'active') {
          const finishedEntry = {
            exerciseId: currentDef.id,
            exerciseName: currentDef.name,
            durationSec: currentItem.durationSec,
            caloriesBurned: calculateExerciseCalories(
              currentDef.met,
              weightKg,
              currentItem.durationSec
            ),
            sourceMealId,
            planItemId: currentItem.planItemId,
          };
          setCompletedLog((old) => {
            const nextList = [...old, finishedEntry];
            if (stepIdx >= playlist.length - 1) {
              soundEngine.playVictoryFanfare();
              setPhase('finished');
              onCompleteWorkout(nextList);
            }
            return nextList;
          });

          if (stepIdx < playlist.length - 1) {
            soundEngine.playRestChime();
            setPhase('rest');
            return 15;
          }
          return 0;
        }

        if (phase === 'rest') {
          const nextIdx = stepIdx + 1;
          setStepIdx(nextIdx);
          soundEngine.playStartGo();
          setPhase('active');
          return playlist[nextIdx].durationSec;
        }

        return 0;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [
    paused,
    phase,
    stepIdx,
    currentItem.durationSec,
    currentItem.planItemId,
    currentDef.id,
    currentDef.met,
     currentDef.name,
    playlist,
    weightKg,
    sourceMealId,
    onCompleteWorkout,
  ]);

  const toggleMute = () => {
    const next = !muted;
    soundEngine.muted = next;
    if (next) {
      soundEngine.stopBgm();
      soundEngine.stop180Metronome();
    }
    setMuted(next);
  };

  const handleSelectBgm = (nextStyle: BgmStyle) => {
    soundEngine.unlock();
    if (nextStyle !== 'off' && muted) {
      soundEngine.muted = false;
      setMuted(false);
    }
    soundEngine.setBgmStyle(nextStyle);
    setBgmStyle(nextStyle);
  };

  const handleSkipCurrent = () => {
    const finishedEntry = recordCurrentStepFinished();
    if (stepIdx < playlist.length - 1) {
      setStepIdx(stepIdx + 1);
      setPhase('active');
      setSecondsLeft(playlist[stepIdx + 1].durationSec);
      soundEngine.playStartGo();
    } else {
      const finalItems = [...completedLog, finishedEntry];
      soundEngine.playVictoryFanfare();
      setPhase('finished');
      onCompleteWorkout(finalItems);
    }
  };

  const formatClock = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const totalPhaseSec =
    phase === 'ready' ? 3 : phase === 'rest' ? 15 : Math.max(1, currentItem.durationSec);
  const progressPct = Math.min(
    100,
    Math.max(0, ((totalPhaseSec - secondsLeft) / totalPhaseSec) * 100)
  );
  const totalBurnedSoFar = completedLog.reduce((sum, x) => sum + x.caloriesBurned, 0);
  const isHalfwaySwitch =
    phase === 'active' &&
    UNILATERAL_IDS.has(currentDef.id) &&
    secondsLeft <= Math.floor(currentItem.durationSec / 2);

  return (
    <div className="fixed inset-0 z-50 bg-[#422B1D]/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-md doodle-card p-5 relative my-auto">
        {/* Header Controls */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-[#F5E6D3] text-xs font-bold text-[#5C3F2D]">
              動作 {Math.min(stepIdx + 1, playlist.length)} / {playlist.length}
            </span>
            {currentDef.hasMetronome180 && phase === 'active' && (
              <button
                type="button"
                onClick={() => setMetronomeOn((v) => !v)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border transition ${
                  metronomeOn
                    ? 'bg-[#8FBC8B] text-white border-[#422B1D]'
                    : 'bg-white text-[#7C5841] border-[#DFC8AC]'
                }`}
              >
                <Music className="w-3.5 h-3.5" />
                180節拍 {metronomeOn ? 'ON' : 'OFF'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              className="p-2 rounded-full bg-[#FAF4EB] border border-[#DFC8AC] text-[#5C3F2D]"
              title={muted ? '開啟音樂與提示音' : '靜音'}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full bg-[#FAF4EB] border border-[#DFC8AC] text-[#5C3F2D]"
              title="關閉跟練視窗"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Background Music (BGM) Selector Bar */}
        {phase !== 'finished' && (
          <div className="flex items-center justify-between gap-1.5 mb-3 p-1.5 rounded-2xl bg-[#FAF4EB] border border-[#E5CFB3]">
            {[
              { id: 'cheerful' as BgmStyle, label: '🎵 輕快棉花糖律動' },
              { id: 'musicbox' as BgmStyle, label: '🎹 溫柔療癒音樂盒' },
              { id: 'off' as BgmStyle, label: '🔕 僅提示音' },
            ].map((opt) => {
              const active = !muted && bgmStyle === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectBgm(opt.id)}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-black transition ${
                    active
                      ? 'bg-[#F3C85F] text-[#2C241E] shadow-sm border border-[#2C241E]/40'
                      : 'text-[#6E6459] hover:bg-white/60'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Finished Celebration Screen */}
        {phase === 'finished' ? (
          <div className="text-center py-2 space-y-4">
            <div className="rounded-2xl bg-[#F3C85F] py-3">
              <MascotDuoIllustration mood="proud" className="w-44 h-28 mx-auto" />
            </div>
            <MarshmallowStampBadge label="成功幫 Quokka & BOBO 疊高一顆棉花糖！" />
            <h3 className="text-2xl font-black text-[#422B1D]">太棒了！跟練挑戰完成 🎉</h3>
            <p className="text-sm leading-relaxed text-[#5C3F2D] bg-[#FFF6E8] p-3.5 rounded-2xl border border-[#ECD4B4]">
              {praiseText}
            </p>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-2xl bg-[#FAF4EB] border border-[#E5CFB3]">
                <div className="text-xs text-[#7C5841]">完成動作數</div>
                <div className="text-xl font-black text-[#422B1D]">{completedLog.length} 個</div>
              </div>
              <div className="p-3 rounded-2xl bg-[#FAF4EB] border border-[#E5CFB3]">
                <div className="text-xs text-[#7C5841]">溫柔消耗熱量</div>
                <div className="text-xl font-black text-[#BA7E4D]">🔥 {totalBurnedSoFar} kcal</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl bg-[#BA7E4D] text-white font-bold doodle-btn flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              收下誇誇，回到今日日記 🤎
            </button>
          </div>
        ) : phase === 'rest' ? (
          /* Rest Screen */
          <div className="text-center py-3 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E3F1DF] text-[#355E30] text-xs font-bold">
              🍵 組間溫柔休息時間
            </div>
            <h3 className="text-xl font-black text-[#422B1D]">
              喝口水喘口氣～Bobo 幫妳搧搧風 🤍
            </h3>
            <div className="text-5xl font-black text-[#BA7E4D] tracking-tight py-2">
              {formatClock(secondsLeft)}
            </div>
            <div className="p-3 rounded-2xl bg-[#FAF4EB] border border-[#E5CFB3] text-left">
              <div className="text-xs text-[#7C5841] mb-1">下一個動作預告：</div>
              <div className="font-bold text-[#422B1D]">
                👉 {getExerciseById(playlist[stepIdx + 1].exerciseId).name}（
                {playlist[stepIdx + 1].durationSec} 秒）
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSecondsLeft((s) => s + 15)}
                className="flex-1 py-3 rounded-2xl bg-[#FAF4EB] font-bold text-sm doodle-btn flex items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4" /> 多休息 15 秒
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextIdx = stepIdx + 1;
                  setStepIdx(nextIdx);
                  setPhase('active');
                  setSecondsLeft(playlist[nextIdx].durationSec);
                  soundEngine.playStartGo();
                }}
                className="flex-1 py-3 rounded-2xl bg-[#8FBC8B] text-white font-bold text-sm doodle-btn"
              >
                準備好了直接開始 ▶
              </button>
            </div>
          </div>
        ) : (
          /* Ready or Active Coaching Screen */
          <div className="space-y-3.5">
            <div className="text-center">
              <h3 className="text-xl font-black text-[#422B1D]">{currentDef.name}</h3>
              <p className="text-xs text-[#7C5841] mt-0.5">{currentDef.subtitle}</p>
            </div>

            {/* Animated Quokka & Bobo Demonstration */}
            <ExerciseAnimationStage
              exerciseId={currentDef.id}
              paused={paused}
              className="w-full h-44"
            />

            {/* Halfway Switch Alert or Quokka Cheer */}
            {isHalfwaySwitch ? (
              <div className="px-3 py-2 rounded-xl bg-[#FDECC8] border border-[#E8C07A] text-center text-xs font-bold text-[#7A5116]">
                🔔 時間過一半囉！溫柔換另一邊繼續做吧 ✨
              </div>
            ) : (
              <div className="px-3 py-2 rounded-xl bg-[#FFF6E8] border border-[#ECD4B4] text-xs text-[#5C3F2D] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#F4B860] shrink-0" />
                <span>{currentDef.quokkaCheer}</span>
              </div>
            )}

            {/* Big Countdown Timer + Progress Bar */}
            <div className="bg-[#FAF4EB] rounded-2xl p-3.5 border border-[#E5CFB3]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#7C5841]">
                  {phase === 'ready' ? '🌟 準備開始倒數...' : `💨 ${currentDef.breathingTip}`}
                </span>
                <span className="text-xs font-bold text-[#BA7E4D]">
                  約 {calculateExerciseCalories(currentDef.met, weightKg, currentItem.durationSec)} kcal
                </span>
              </div>
              <div className="text-center text-4xl font-black text-[#422B1D] tracking-wider my-1">
                {phase === 'ready' ? `準備 ${secondsLeft}` : formatClock(secondsLeft)}
              </div>
              <div className="w-full h-3 rounded-full bg-[#EAD8C0] overflow-hidden mt-2">
                <div
                  className="h-full bg-gradient-to-r from-[#8FBC8B] to-[#BA7E4D] transition-all duration-500 rounded-full"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Posture Step Tips */}
            <div className="space-y-1.5 text-xs text-[#5C3F2D] bg-white/80 rounded-2xl p-3 border border-[#EAD8C0]">
              {currentDef.steps.map((st, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#F5E6D3] text-[#5C3F2D] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{st}</span>
                </div>
              ))}
            </div>

            {/* Player Controls */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                className="flex-1 py-3 rounded-2xl bg-[#F4B860] text-[#422B1D] font-bold doodle-btn flex items-center justify-center gap-2"
              >
                {paused ? (
                  <>
                    <Play className="w-4 h-4 fill-current" /> 繼續跟練
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4" /> 暫停一下
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleSkipCurrent}
                className="px-4 py-3 rounded-2xl bg-[#FAF4EB] text-[#5C3F2D] font-bold text-sm doodle-btn flex items-center gap-1.5"
                title="完成此動作並前往下一步"
              >
                <SkipForward className="w-4 h-4" />
                {stepIdx < playlist.length - 1 ? '下一動' : '完成打卡'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
