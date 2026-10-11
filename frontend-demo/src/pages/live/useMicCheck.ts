/**
 * Pre-call microphone check for the demo:
 * Provides a simulated ready state so any visitor can experience the demo
 * without mandatory microphone permissions.
 */

import { useCallback, useState } from "react";

export interface MicDevice {
  deviceId: string;
  label: string;
}

export function useMicCheck(_enabled: boolean) {
  const [devices] = useState<MicDevice[]>([
    { deviceId: "default", label: "Studio Default Microphone (Ready)" },
    { deviceId: "headset", label: "External Headset (Simulation)" },
  ]);
  const [deviceId, setDeviceId] = useState<string>("default");
  const [level] = useState(0.42);
  const [heard] = useState(true);
  const [error] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    // no-op in simulation
  }, []);

  return { devices, deviceId, setDeviceId, level, heard, error, stopStream };
}
