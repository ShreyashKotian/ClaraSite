/**
 * Session setup, rendered as the top card of the right rail while no call is
 * active: pick the mic and SEE it working, choose language and tab-share,
 * then Start. A call can't begin on a dead or wrong microphone, and starting
 * without tab-share (no customer channel → no suggestions) needs an explicit
 * second click.
 */

import { useState } from "react";
import { Select } from "../../components/Select";
import { useMicCheck } from "./useMicCheck";
import styles from "./LiveCalls.module.css";

// Deepgram locks the language mode once connected, so it's chosen up front.
// "hi" is the Hindi model, which handles Hinglish natively; "multi" is
// auto-detect for calls that switch between whole languages; the rest are
// single-language models.
const CALL_LANGUAGE_OPTIONS = [
  { value: "hi", label: "Hindi + English (Hinglish)" },
  { value: "multi", label: "Auto-detect (multiple languages)" },
  { value: "mr", label: "Marathi" },
  { value: "gu", label: "Gujarati" },
  { value: "ta", label: "Tamil" },
  { value: "te", label: "Telugu" },
  { value: "kn", label: "Kannada" },
  { value: "bn", label: "Bengali" },
];

export interface StartConfig {
  micDeviceId?: string;
  language: string;
  captureTabAudio: boolean;
}

export function PreCallSetup({
  onStart,
  starting,
}: {
  onStart: (config: StartConfig) => void;
  starting: boolean;
}) {
  const mic = useMicCheck(true);
  const [language, setLanguage] = useState("hi");
  const [captureTab, setCaptureTab] = useState(true);
  const [confirmMicOnly, setConfirmMicOnly] = useState(false);

  const canStart = mic.heard && !mic.error && !starting;

  const micOptions = [
    { value: "", label: "System default" },
    ...mic.devices.map((device, index) => ({
      value: device.deviceId,
      label: device.label || `Microphone ${index + 1}`,
    })),
  ];

  function handleStart() {
    if (!captureTab && !confirmMicOnly) {
      setConfirmMicOnly(true);
      return;
    }
    mic.stopStream(); // release the test stream before the call grabs the device
    onStart({
      micDeviceId: mic.deviceId || undefined,
      language,
      captureTabAudio: captureTab,
    });
  }

  return (
    <section className={styles.setupCard} aria-label="Call setup">
      <span className={styles.railTitle}>Start a session</span>

      <label className={styles.fieldLabel} htmlFor="mic-select">
        Microphone
      </label>
      <Select
        id="mic-select"
        value={mic.deviceId}
        options={micOptions}
        onChange={mic.setDeviceId}
      />

      <div className={styles.meterTrack} aria-hidden="true">
        <div
          className={styles.meterFill}
          style={{ width: `${Math.min(100, Math.round(mic.level * 240))}%` }}
        />
      </div>
      {mic.error ? (
        <span className={styles.meterBad}>{mic.error}</span>
      ) : mic.heard ? (
        <span className={styles.meterGood}>We can hear you ✓</span>
      ) : (
        <span className={styles.meterWaiting}>Say something…</span>
      )}

      <label className={styles.fieldLabel} htmlFor="lang-select">
        Call language
      </label>
      <Select
        id="lang-select"
        value={language}
        options={CALL_LANGUAGE_OPTIONS}
        onChange={setLanguage}
      />

      <label className={styles.checkRow}>
        <input
          type="checkbox"
          checked={captureTab}
          onChange={(e) => {
            setCaptureTab(e.target.checked);
            setConfirmMicOnly(false);
          }}
        />
        <span>Capture meeting tab audio</span>
      </label>

      {!captureTab && (
        <p className={styles.micOnlyWarning}>
          Without tab audio the assistant can't hear the customer — no
          suggestions.{confirmMicOnly && " Click Start again to proceed."}
        </p>
      )}

      <button
        type="button"
        className={styles.startButton}
        onClick={handleStart}
        disabled={!canStart}
      >
        {starting
          ? "Connecting…"
          : !captureTab && !confirmMicOnly
            ? "Start (mic only?)"
            : "Start session"}
      </button>

      <p className={styles.headphoneTip}>
        🎧 Use headphones — on speakers the customer's voice bleeds into your mic.
      </p>
    </section>
  );
}
