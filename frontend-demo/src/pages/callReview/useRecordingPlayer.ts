/**
 * Playback state for one call recording in the demo.
 * Smoothly simulates playback and waveform without network dependencies.
 */

import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from "react";
import { getWaveform } from "../../api/conversations";

export type ListenMode = "both" | "rep" | "customer";
export const WAVEFORM_BARS = 64;

export type RecordingPlayer = ReturnType<typeof useRecordingPlayer>;

export function useRecordingPlayer(conversationId: string, _hasAudio: boolean) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<number | null>(null);

  const ready = true;
  const duration = 192; // 3m 12s demo duration
  const error: string | null = null;

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [listenMode, setListenMode] = useState<ListenMode>("both");
  const [peaks, setPeaks] = useState<number[] | null>(null);

  useEffect(() => {
    getWaveform(conversationId).then(({ peaks: measured }) => {
      setPeaks(measured);
    });
  }, [conversationId]);

  const toggle = useCallback(() => {
    setPlaying((prev) => !prev);
  }, []);

  const seek = useCallback((seconds: number) => {
    setCurrentTime(seconds);
  }, []);

  useEffect(() => {
    if (playing) {
      timerRef.current = window.setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= duration) {
            setPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playing, duration]);

  const audioProps = {
    ref: audioRef,
    src: undefined,
    preload: "metadata" as const,
    onPlay: () => setPlaying(true),
    onPause: () => setPlaying(false),
    onEnded: () => setPlaying(false),
    onTimeUpdate: (e: SyntheticEvent<HTMLAudioElement>) =>
      setCurrentTime(e.currentTarget.currentTime),
    onLoadedMetadata: () => {},
    onError: () => {},
  };

  return {
    audioProps,
    ready,
    error,
    playing,
    currentTime,
    duration,
    peaks,
    mode: listenMode,
    setMode: setListenMode,
    toggle,
    seek,
  };
}
