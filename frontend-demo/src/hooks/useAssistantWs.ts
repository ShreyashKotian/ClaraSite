import { useCallback, useEffect, useRef, useState } from "react";
import type { SessionState, WsMessage } from "../types";

export type ConnectOptions = {
  language?: string;
  captureTabAudio?: boolean;
  micDeviceId?: string;
};

export type AssistantWsApi = {
  status: SessionState["status"];
  error: string | null;
  warning: string | null;
  messages: WsMessage[];
  sessionId: string | null;
  lastEndedSessionId: string | null;
  elapsedSeconds: number;
  speakers: number[];
  leadSpeakerId: number | null;
  connect: (apiKey?: string, options?: ConnectOptions) => Promise<void>;
  disconnect: () => void;
  sendSuggestionUsed: (generationId: number) => void;
};

const SIMULATED_EVENTS: {
  delayMs: number;
  message: WsMessage;
}[] = [
  {
    delayMs: 1200,
    message: {
      type: "transcript_final",
      speaker: 1, // Prospect
      text: "Hello Alex, I saw your advertisement for the new residential project. We are exploring a 2 BHK or 3 BHK.",
      start_ms: 0,
      end_ms: 5500,
    },
  },
  {
    delayMs: 2200,
    message: {
      type: "retrieval_done",
      generation_id: 1,
      query: "Luxury residences 2 BHK or 3 BHK pricing and availability",
      elapsed_ms: 220,
      sources: [
        {
          id: "kb-001",
          excerpt: "Residential Towers: 2 BHK units starting ₹1.45 Cr, 3 BHK units starting ₹2.10 Cr.",
        },
      ],
    },
  },
  {
    delayMs: 3000,
    message: {
      type: "answer_done",
      generation_id: 1,
      query: "2 BHK or 3 BHK pricing and configurations",
      text:
        "The project offers smart 2 BHK residences starting at ₹1.45 Cr (640 sq.ft) and 3 BHK homes starting at ₹2.10 Cr (980 sq.ft). Ask if their priority is ready possession or lower floor band.",
      from_cache: false,
      intent: "property_inquiry",
      mood: "positive",
    },
  },
  {
    delayMs: 6500,
    message: {
      type: "transcript_final",
      speaker: 0, // Rep
      text: "Good afternoon! Yes, we have attractive 2 BHK units starting from 1.45 Cr and 3 BHK starting from 2.10 Cr. Are you looking to move in this year?",
      start_ms: 6000,
      end_ms: 11000,
    },
  },
  {
    delayMs: 12000,
    message: {
      type: "transcript_final",
      speaker: 1, // Prospect
      text: "Yes, ideally within six months. I am worried about maintenance charges though. How much are society dues?",
      start_ms: 11500,
      end_ms: 17000,
    },
  },
  {
    delayMs: 13000,
    message: {
      type: "answer_done",
      generation_id: 2,
      query: "maintenance charges society dues",
      text:
        "Maintenance is fixed at ₹12/sq.ft (~₹7,680/mo for 2 BHK). Includes access to 50+ clubhouse amenities, 24/7 security, and power backup.",
      from_cache: true,
      intent: "pricing_inquiry",
      mood: "neutral",
    },
  },
  {
    delayMs: 18000,
    message: {
      type: "transcript_final",
      speaker: 0, // Rep
      text: "Our maintenance is very transparent at roughly twelve rupees per square foot, which includes all fifty club amenities and maintenance of landscape gardens.",
      start_ms: 17500,
      end_ms: 23000,
    },
  },
  {
    delayMs: 24000,
    message: {
      type: "transcript_final",
      speaker: 1, // Prospect
      text: "That sounds reasonable. Can we visit the sample flat this Saturday around eleven?",
      start_ms: 23500,
      end_ms: 28000,
    },
  },
  {
    delayMs: 25000,
    message: {
      type: "answer_done",
      generation_id: 3,
      query: "visit sample flat Saturday around eleven",
      text:
        "Saturday 11:00 AM slot is open. Offer to send visitor parking pass & confirm whether their family or loan advisor will accompany.",
      from_cache: false,
      intent: "site_visit",
      mood: "positive",
    },
  },
];

export function useAssistantWs(): AssistantWsApi {
  const [status, setStatus] = useState<SessionState["status"]>("idle");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [messages, setMessages] = useState<WsMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lastEndedSessionId, setLastEndedSessionId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const timerRef = useRef<number | null>(null);
  const timeoutsRef = useRef<number[]>([]);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
  }, []);

  const connect = useCallback(
    async (_apiKey?: string, _options?: ConnectOptions) => {
      cleanup();
      setError(null);
      setWarning(null);
      setStatus("connecting");
      const currentSessionId = `demo-live-${Date.now()}`;
      setSessionId(currentSessionId);
      setMessages([]);
      setElapsedSeconds(0);

      // Brief simulated connection handshake
      await new Promise((resolve) => setTimeout(resolve, 600));
      setStatus("live");

      // Start call elapsed timer
      const startTime = Date.now();
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      // Schedule simulated dialogue events
      SIMULATED_EVENTS.forEach(({ delayMs, message }) => {
        const timeoutId = window.setTimeout(() => {
          setMessages((prev) => [...prev, message]);
        }, delayMs);
        timeoutsRef.current.push(timeoutId);
      });
    },
    [cleanup]
  );

  const disconnect = useCallback(() => {
    cleanup();
    if (sessionId) {
      setLastEndedSessionId(sessionId);
    }
    setStatus("idle");
    setSessionId(null);
  }, [cleanup, sessionId]);

  const sendSuggestionUsed = useCallback((_generationId: number) => {
    // Adoption recorded in demo
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    status,
    error,
    warning,
    messages,
    sessionId,
    lastEndedSessionId,
    elapsedSeconds,
    speakers: [0, 1],
    leadSpeakerId: 1,
    connect,
    disconnect,
    sendSuggestionUsed,
  };
}
