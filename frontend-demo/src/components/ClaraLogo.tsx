/**
 * The ClaraAI brand, in two parts that can be used together or apart.
 *
 * `ClaraMark` is the real artwork — the C-ring with the speech lines — served
 * from public/brand at 256px, which is plenty for any on-screen size up to
 * ~120px on a 2× display. `ClaraWordmark` renders the name in live text so it
 * stays legible on both themes (the supplied wordmark PNG has a white "Clara",
 * which vanishes on a light page), with the "AI" carrying the same cyan → blue
 * → magenta sweep as the official lockup.
 */

import styles from "./ClaraLogo.module.css";

export function ClaraMark({ size = 36 }: { size?: number }) {
  return (
    <img
      src="./brand/clara-mark.png"
      width={size}
      height={size}
      alt="ClaraAI Logo"
      className={styles.mark}
      draggable={false}
    />
  );
}

export function ClaraWordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className={styles.c}>C</span>lara<span className={styles.ai}>AI</span>
    </span>
  );
}
