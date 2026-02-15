/**
 * AdversarialScene — Pixel-accurate replica of the real adversarial view.
 *
 * Timeline:
 *   0-3s:   App with case selected, cursor moves to Adversarial Sim button
 *   3-4s:   Click → adversarial view appears
 *   4-12s:  Prosecution phase: thinking streams, content builds
 *   12-20s: Defense phase: reads prosecution, builds counter-arguments
 *   20-27s: Judicial phase: synthesizes both sides
 *   27-29s: Token summary appears
 */

import React from 'react';
import { useCurrentFrame } from 'remotion';
import { COLORS, FPS, FONTS } from '../config';
import { countUp, fade, slideUp } from '../styles';
import { AppShell } from '../components/AppShell';
import { Cursor, type CursorWaypoint } from '../components/Cursor';

const CURSOR: CursorWaypoint[] = [
  { frame: 0, x: 150, y: 700 },                 // start in sidebar
  { frame: 30, x: 150, y: 920, click: true },   // click Marcus Webb (index 7 in sidebar)
  { frame: 60, x: 678, y: 143 },                // move to Adversarial Sim button (case-actions row)
  { frame: 90, x: 678, y: 143, click: true },   // click
  { frame: 180, x: 700, y: 450 },               // watch prosecution (left column)
  { frame: 400, x: 1400, y: 450 },              // watch defense (right column)
  { frame: 600, x: 1000, y: 850 },              // watch judge (bottom, full width)
  { frame: 750, x: 1000, y: 850, hidden: true },
];

// ── Phase data ───────────────────────────────────────────────

interface Phase {
  title: string;
  headerTitle: string;
  color: string;
  borderColor: string;
  thinkingLines: string[];
  startSec: number;
}

const PHASES: Phase[] = [
  {
    title: 'Prosecution Brief',
    headerTitle: 'Prosecution Brief',
    color: COLORS.red,
    borderColor: COLORS.red,
    startSec: 4,
    thinkingLines: [
      'Analyzing evidence chain: traffic stop initiated at 11:47 PM...',
      'Vehicle search yielded 47g suspected controlled substance...',
      'Officer Rodriguez noted "furtive movements" in report...',
      'Prior record: two misdemeanor convictions, no felonies...',
      'Aggravating factor: school zone proximity (0.3 miles)...',
      'Recommended charge: Possession with Intent to Distribute...',
    ],
  },
  {
    title: 'Defense Response',
    headerTitle: 'Defense Response',
    color: COLORS.green,
    borderColor: COLORS.green,
    startSec: 12,
    thinkingLines: [
      'Reading prosecution brief... 6 key arguments identified...',
      'Challenging: "furtive movements" is subjective and vague...',
      'Officer Rodriguez has 4 contested searches — pattern of abuse...',
      'Consent was obtained under duress — flashing lights, late hour...',
      'State v. Henderson: consent must be voluntary and uncoerced...',
      'Motion to suppress: fruit of the poisonous tree doctrine...',
    ],
  },
  {
    title: 'Judicial Analysis',
    headerTitle: 'Judicial Analysis',
    color: COLORS.gold,
    borderColor: COLORS.gold,
    startSec: 20,
    thinkingLines: [
      'Weighing prosecution evidence against defense challenges...',
      'The consent issue is the pivotal question in this case...',
      'Rodriguez pattern strengthens defense Fourth Amendment claim...',
      'Prosecution case relies heavily on physical evidence...',
      'If suppression motion succeeds, prosecution case collapses...',
      'Recommendation: motion to suppress has strong prospects...',
    ],
  },
];

// ── Component ────────────────────────────────────────────────

export const AdversarialScene: React.FC = () => {
  const f = useCurrentFrame();

  const clickFrame = 90;
  const isActive = f >= clickFrame;

  const tokenThinking = isActive ? countUp(f, clickFrame, 600, 0, 80000) : 0;
  const tokenOutput = isActive ? countUp(f, clickFrame + 200, 400, 0, 24000) : 0;
  const summaryStart = 27 * FPS;

  // Current phase (0-indexed)
  const currentPhase = !isActive ? -1 :
    f < PHASES[1].startSec * FPS ? 0 :
    f < PHASES[2].startSec * FPS ? 1 : 2;

  return (
    <>
      <AppShell
        casesVisible={20}
        totalCases={500}
        felonyCount={167}
        misdemeanorCount={333}
        tokenInput={isActive ? 12000 : 0}
        tokenThinking={tokenThinking}
        tokenOutput={tokenOutput}
        tokenCalls={isActive ? 3 : 0}
        statusText={!isActive ? 'Ready' : f >= summaryStart ? 'Complete' : `Phase ${currentPhase + 1}/3`}
        statusColor={!isActive ? 'ready' : f >= summaryStart ? 'ready' : 'analyzing'}
        selectedCaseId="CR-2025-0012"
      >
        {!isActive ? (
          /* ── Pre-click: Case detail view with action buttons ── */
          <CaseDetailView frame={f} />
        ) : (
          /* ── Post-click: Adversarial view (matches real UI) ── */
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0, overflow: 'hidden' }}>
            {/* ── Adversarial Header ── */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              marginBottom: 14,
              flexShrink: 0,
            }}>
              <button style={{
                background: 'transparent',
                color: COLORS.textSecondary,
                border: 'none',
                padding: '7px 14px',
                fontSize: 13.5,
                fontFamily: FONTS.sans,
                cursor: 'pointer',
              }}>
                &larr; Back to Case
              </button>
              <h2 style={{
                fontSize: 18,
                fontWeight: 600,
                color: COLORS.text,
                margin: 0,
              }}>
                Adversarial Simulation
              </h2>
              <span style={{
                fontFamily: FONTS.mono,
                color: COLORS.gold,
                fontWeight: 400,
                fontSize: 13.5,
              }}>
                CR-2025-0012
              </span>
            </div>

            {/* ── Phase Progress Bar (real UI: numbered circles + connectors) ── */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0,
              padding: '18px 24px',
              background: COLORS.bgCard,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 8,
              marginBottom: 18,
              flexShrink: 0,
              opacity: fade(f, clickFrame + 10, 20),
            }}>
              {PHASES.map((phase, i) => {
                const isCurrentStep = currentPhase === i;
                const isComplete = currentPhase > i;

                const numBg = isCurrentStep ? COLORS.gold
                  : isComplete ? COLORS.green
                  : COLORS.bgTertiary;
                const numColor = isCurrentStep ? '#000'
                  : isComplete ? '#fff'
                  : COLORS.textMuted;
                const labelColor = isCurrentStep ? COLORS.gold
                  : isComplete ? COLORS.green
                  : COLORS.textMuted;
                const stepBg = isCurrentStep ? COLORS.goldGlow : 'transparent';
                const stepBorder = isCurrentStep ? `1px solid ${COLORS.borderAccent}` : '1px solid transparent';

                return (
                  <React.Fragment key={phase.title}>
                    {/* Connector before (skip first) */}
                    {i > 0 && (
                      <div style={{
                        width: 40,
                        height: 2,
                        background: currentPhase > i - 1 ? COLORS.green : COLORS.border,
                        boxShadow: currentPhase > i - 1 ? '0 0 8px rgba(34, 197, 94, 0.2)' : 'none',
                      }} />
                    )}
                    {/* Phase step */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 18px',
                      borderRadius: 20,
                      fontSize: 13,
                      fontWeight: 500,
                      color: labelColor,
                      background: stepBg,
                      border: stepBorder,
                    }}>
                      <div style={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 600,
                        background: numBg,
                        color: numColor,
                        border: !isCurrentStep && !isComplete ? `1px solid ${COLORS.border}` : 'none',
                        boxShadow: isCurrentStep ? '0 0 12px rgba(201, 168, 76, 0.3)' : 'none',
                      }}>
                        {isComplete ? '✓' : i + 1}
                      </div>
                      <span style={{ fontSize: 12 }}>{phase.title}</span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            {/* ── Brief Panels Grid (matches .adversarial-briefs) ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gridTemplateRows: '1fr auto',
              gap: 16,
              flex: 1,
              minHeight: 0,
            }}>
              {PHASES.map((phase, i) => {
                const phaseStart = phase.startSec * FPS;
                const phaseActive = f >= phaseStart;
                const isDone = i < 2 ? currentPhase > i : f >= 25 * FPS;
                const isJudge = i === 2;
                const dimmed = !phaseActive && currentPhase >= 0;

                // How many thinking lines to show
                const linesVisible = !phaseActive ? 0 :
                  Math.min(phase.thinkingLines.length, Math.floor((f - phaseStart) / 25));

                return (
                  <div
                    key={phase.title}
                    style={{
                      gridColumn: isJudge ? '1 / -1' : undefined,
                      background: COLORS.bgCard,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 8,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: 0,
                      opacity: dimmed ? 0.35 : 1,
                      transition: 'opacity 0.4s',
                    }}
                  >
                    {/* ── Brief Header (matches .brief-header) ── */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 16px',
                      borderBottom: `1px solid ${COLORS.border}`,
                      borderLeft: `3px solid ${phase.borderColor}`,
                      flexShrink: 0,
                    }}>
                      <span style={{
                        fontFamily: FONTS.mono,
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: 'uppercase' as const,
                        letterSpacing: '0.5px',
                        color: COLORS.textMuted,
                        padding: '2px 8px',
                        background: COLORS.bgTertiary,
                        borderRadius: 4,
                      }}>
                        Phase {i + 1}
                      </span>
                      <h3 style={{
                        fontFamily: FONTS.sans,
                        fontSize: 15,
                        fontWeight: 600,
                        margin: 0,
                        color: phase.color,
                      }}>
                        {phase.headerTitle}
                      </h3>
                      {isJudge && (
                        <span style={{
                          fontSize: 12,
                          color: COLORS.textMuted,
                          fontWeight: 400,
                          marginLeft: 'auto',
                        }}>
                          Objective assessment by senior judicial analyst
                        </span>
                      )}
                    </div>

                    {/* ── Thinking Details (matches <details class="thinking-details">) ── */}
                    {phaseActive && (
                      <div style={{
                        borderBottom: `1px solid ${COLORS.border}`,
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 16px',
                          cursor: 'pointer',
                          fontSize: 12,
                          color: COLORS.textMuted,
                        }}>
                          <span style={{
                            color: phaseActive ? phase.color : COLORS.textMuted,
                            fontSize: 14,
                          }}>
                            &bull;
                          </span>
                          <span>Reasoning</span>
                          <span style={{
                            fontFamily: FONTS.mono,
                            fontSize: 10,
                            color: COLORS.textMuted,
                            marginLeft: 'auto',
                          }}>
                            {linesVisible > 0 ? `${(linesVisible * 4200).toLocaleString()} tokens` : ''}
                          </span>
                        </div>
                        {/* Thinking stream content */}
                        <div style={{
                          padding: '0 16px 10px',
                          maxHeight: isJudge ? 80 : 120,
                          overflow: 'hidden',
                        }}>
                          {phase.thinkingLines.slice(0, linesVisible).map((line, li) => {
                            const lineStart = phaseStart + li * 25;
                            const charsVisible = Math.min(
                              line.length,
                              Math.round(((f - lineStart) / 20) * line.length),
                            );

                            return (
                              <div
                                key={li}
                                style={{
                                  fontSize: 12,
                                  fontFamily: FONTS.mono,
                                  color: COLORS.textSecondary,
                                  lineHeight: 1.6,
                                  opacity: fade(f, lineStart, 12),
                                }}
                              >
                                {line.slice(0, charsVisible)}
                                {charsVisible < line.length && (
                                  <span style={{ color: phase.color }}>▊</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* ── Brief Body (matches .brief-body > .side-content) ── */}
                    <div style={{
                      padding: '12px 16px',
                      flex: 1,
                      overflow: 'hidden',
                      minHeight: 40,
                    }}>
                      {!phaseActive && (
                        <span style={{ color: COLORS.textMuted, fontSize: 12, fontStyle: 'italic' }}>
                          Waiting...
                        </span>
                      )}
                      {isDone && (
                        <div style={{ opacity: fade(f, (i < 2 ? PHASES[i + 1].startSec : 25) * FPS, 20) }}>
                          <div style={{
                            fontSize: 10,
                            fontFamily: FONTS.mono,
                            color: phase.color,
                            letterSpacing: '0.08em',
                            marginBottom: 8,
                            textTransform: 'uppercase' as const,
                          }}>
                            Generated Brief
                          </div>
                          <div style={{ fontSize: 12.5, color: COLORS.text, lineHeight: 1.7, fontWeight: 400 }}>
                            {i === 0 && <ProsecutionBrief />}
                            {i === 1 && <DefenseBrief />}
                            {i === 2 && <JudicialBrief />}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Token summary */}
            {f >= summaryStart && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 24,
                marginTop: 12,
                flexShrink: 0,
                opacity: fade(f, summaryStart, 25),
                transform: `translateY(${slideUp(f, summaryStart, 15, 25)}px)`,
              }}>
                <span style={{ fontSize: 36, fontWeight: 800, fontFamily: FONTS.mono, color: COLORS.gold }}>
                  {countUp(f, summaryStart + 5, 60, 0, 80000).toLocaleString()}+
                </span>
                <span style={{ fontSize: 18, color: COLORS.textSecondary }}>tokens of chained reasoning</span>
              </div>
            )}
          </div>
        )}
      </AppShell>

      <Cursor waypoints={CURSOR} appearAt={10} />
    </>
  );
};

// ── Case Detail View (pre-click state, matches real case-header + case-actions) ──

const CaseDetailView: React.FC<{ frame: number }> = ({ frame }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    {/* Case header with back button */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <button style={{
        background: 'transparent',
        color: COLORS.textSecondary,
        border: 'none',
        padding: '7px 14px',
        fontSize: 13.5,
        fontFamily: FONTS.sans,
      }}>
        &larr; Back to Dashboard
      </button>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: COLORS.text, margin: 0 }}>
        CR-2025-0012 — Marcus Webb
      </h2>
    </div>

    {/* Action buttons (matches real .case-actions) */}
    <div style={{ display: 'flex', gap: 8 }}>
      <ActionButton label="Hearing Prep" variant="primary" />
      <ActionButton label="Deep Analysis" variant="secondary" />
      <ActionButton label="Adversarial Sim" variant="secondary" highlight />
      <ActionButton label="Draft Motion" variant="secondary" />
      <ActionButton label="Client Letter" variant="secondary" />
    </div>

    {/* Case overview content placeholder */}
    <div style={{
      display: 'flex',
      gap: 16,
      marginTop: 8,
      opacity: fade(frame, 5, 20),
    }}>
      {/* Case info cards */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <InfoRow label="Charge" value="Traffic Stop — DUI" />
        <InfoRow label="Severity" value="Misdemeanor" color={COLORS.blue} />
        <InfoRow label="Status" value="ACTIVE" color={COLORS.green} />
        <InfoRow label="Next Hearing" value="2026-02-18" />
        <InfoRow label="Arresting Officer" value="J. Rodriguez" color={COLORS.orange} />
        <InfoRow label="Plea Offer" value="12 months probation" />
      </div>
    </div>
  </div>
);

const ActionButton: React.FC<{ label: string; variant: 'primary' | 'secondary'; highlight?: boolean }> = ({ label, variant, highlight }) => {
  const isPrimary = variant === 'primary';
  return (
    <div style={{
      padding: '9px 18px',
      borderRadius: 8,
      fontSize: 13,
      fontWeight: isPrimary ? 600 : 500,
      fontFamily: FONTS.sans,
      letterSpacing: '0.02em',
      background: isPrimary
        ? `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldBright})`
        : COLORS.surfaceRaised,
      color: isPrimary ? '#0a0b0e' : COLORS.text,
      border: isPrimary ? 'none' : `1px solid ${highlight ? COLORS.borderAccent : COLORS.borderLight}`,
      boxShadow: highlight ? `0 0 12px rgba(212, 175, 55, 0.08)` : 'none',
    }}>
      {label}
    </div>
  );
};

const InfoRow: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <span style={{ fontSize: 11, color: COLORS.textMuted, width: 120, textAlign: 'right', fontWeight: 500 }}>{label}</span>
    <span style={{ fontSize: 13, color: color || COLORS.text, fontWeight: 500 }}>{value}</span>
  </div>
);

// ── Detailed Brief Content ──────────────────────────────────

const BriefHeading: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color }) => (
  <div style={{ fontSize: 13, fontWeight: 700, color: color || COLORS.text, marginTop: 10, marginBottom: 4 }}>
    {children}
  </div>
);

const BriefPara: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ marginBottom: 8 }}>{children}</div>
);

const ProsecutionBrief: React.FC = () => (
  <>
    <BriefHeading color={COLORS.red}>I. Establishment of Probable Cause</BriefHeading>
    <BriefPara>
      On January 14, 2025, Officer J. Rodriguez initiated a lawful traffic stop of the defendant's vehicle at 11:47 PM after observing the vehicle cross the center line twice on Peachtree Street NW. Upon approach, Officer Rodriguez detected a strong odor of marijuana emanating from the vehicle and observed the defendant make furtive movements toward the center console.
    </BriefPara>
    <BriefHeading color={COLORS.red}>II. Evidence Recovery</BriefHeading>
    <BriefPara>
      A subsequent search of the vehicle yielded 47 grams of a suspected controlled substance (field-tested positive for cocaine), individually packaged in 12 separate baggies consistent with distribution. A digital scale and $2,340 in cash were recovered from the center console. The packaging, quantity, and presence of distribution paraphernalia support the charge of Possession with Intent to Distribute under O.C.G.A. § 16-13-30(b).
    </BriefPara>
    <BriefHeading color={COLORS.red}>III. Aggravating Factors</BriefHeading>
    <BriefPara>
      The arrest occurred within 0.3 miles of Midtown High School, triggering enhanced penalties under Georgia's Drug-Free School Zone Act, O.C.G.A. § 16-13-32.4. The defendant's prior record includes two misdemeanor drug convictions (2021, 2023), establishing a pattern of escalating drug-related criminal conduct.
    </BriefPara>
  </>
);

const DefenseBrief: React.FC = () => (
  <>
    <BriefHeading color={COLORS.green}>I. Fourth Amendment Challenge — Unlawful Search</BriefHeading>
    <BriefPara>
      The prosecution's entire case rests on physical evidence obtained through a vehicle search of dubious legality. The defendant did not provide voluntary consent — he was confronted at 11:47 PM by an armed officer with activated emergency lights on an isolated stretch of road. Under <span style={{ fontStyle: 'italic' }}>State v. Henderson</span>, consent obtained under such inherently coercive circumstances cannot be deemed voluntary. The "furtive movements" justification is subjective, uncorroborated, and insufficient to establish probable cause.
    </BriefPara>
    <BriefHeading color={COLORS.green}>II. Officer Rodriguez Pattern — Systematic Misconduct</BriefHeading>
    <BriefPara>
      Officer Rodriguez appears in four separate cases in this caseload (CR-2025-0012, CR-2025-0089, CR-2025-0118, CR-2025-0134), all involving contested vehicle searches during routine traffic stops. This pattern of conduct strongly suggests a systematic practice of conducting warrantless searches under the pretext of consent. Defense moves to consolidate these cases for a <span style={{ fontStyle: 'italic' }}>Franks</span> hearing challenging the veracity of Officer Rodriguez's sworn statements.
    </BriefPara>
    <BriefHeading color={COLORS.green}>III. Motion to Suppress — Fruit of the Poisonous Tree</BriefHeading>
    <BriefPara>
      Under <span style={{ fontStyle: 'italic' }}>Wong Sun v. United States</span>, 371 U.S. 471 (1963), all evidence derived from an unconstitutional search must be suppressed. If the initial search is invalidated, the cocaine, scale, cash, and all derivative evidence become inadmissible, leaving the prosecution with no physical evidence to sustain the charges.
    </BriefPara>
  </>
);

const JudicialBrief: React.FC = () => (
  <>
    <BriefHeading color={COLORS.gold}>Assessment of Competing Arguments</BriefHeading>
    <BriefPara>
      The central question is whether consent was voluntary under the totality of the circumstances. The prosecution presents a facially valid traffic stop with articulable probable cause (lane deviation, marijuana odor). However, the defense raises substantial Fourth Amendment concerns that significantly undermine the state's position.
    </BriefPara>
    <BriefPara>
      The Rodriguez pattern across four cases is the most compelling defense argument. A single officer conducting contested vehicle searches in multiple unrelated traffic stops suggests either inadequate training or deliberate circumvention of warrant requirements. This pattern would likely survive a <span style={{ fontStyle: 'italic' }}>Franks</span> challenge and could be devastating at a suppression hearing.
    </BriefPara>
    <BriefHeading color={COLORS.gold}>Disposition Recommendation</BriefHeading>
    <BriefPara>
      <span style={{ fontWeight: 600 }}>Suppression motion viability: HIGH.</span> The defense has strong prospects on the consent voluntariness issue, amplified substantially by the cross-case officer pattern. If suppression is granted, the prosecution's case collapses entirely — no physical evidence survives. Recommend the defense file the suppression motion immediately and request a consolidated hearing with the three related Rodriguez cases.
    </BriefPara>
  </>
);
