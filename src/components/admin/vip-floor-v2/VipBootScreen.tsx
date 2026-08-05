import styles from "./VipFloorWorkspace.module.css";

/*
 * One boot identity for every frame that precedes the ledger.
 *
 * A cold load used to cross four unrelated full-page layouts in about two
 * seconds: an empty `<main>` from the route Suspense boundary, three static
 * grey bars from `app/loading.tsx`, then the whole OWNER ACCESS login frame —
 * a 1180x706 two-column shell carrying a display wordmark and the floor-plan
 * photograph — reused as a progress screen with no form in it. The right
 * column held four short lines against `align-content: center`, so more than
 * half of it was empty, and at 810 CSS points the frame ran 64px past the
 * venue iPad's viewport. Every one of those frames then vanished. The
 * "collapsed" reading was correct: the operator was watching a login page get
 * built and thrown away.
 *
 * This is the single screen those three frames now render. It is deliberately
 * small — mark, queue, one line — so that nothing has to collapse when the
 * workspace replaces it, and it is server-safe so the very first byte can
 * carry it.
 */

type VipBootScreenProps = {
  /** The one line under the queue. Announced politely; keep it a sentence. */
  label?: string;
};

export default function VipBootScreen({
  label = "GHOST予約台帳へ接続しています。",
}: VipBootScreenProps) {
  return (
    <main
      className={styles.bootShell}
      aria-busy="true"
      aria-label="VIP Managerを読み込んでいます"
    >
      <div className={styles.bootFrame}>
        <div className={styles.bootIdentity}>
          <span className={styles.loginMark} aria-hidden>G</span>
          <span className={styles.loginBrand}>
            <span>GHOST OSAKA</span>
            <strong>VIP MANAGER</strong>
          </span>
        </div>
        {/* Four slots on one ruled line: the queue advances, and the record at
            the head is lifted off the line and re-filed at the tail. The motion
            is the product's own loop, not a borrowed spinner. */}
        <div className={styles.bootQueue} aria-hidden>
          <span className={styles.bootDot} />
          <span className={styles.bootDot} />
          <span className={styles.bootDot} />
          <span className={styles.bootDot} />
        </div>
        <p className={styles.bootStatus} role="status" aria-live="polite">
          {label}
        </p>
      </div>
    </main>
  );
}
