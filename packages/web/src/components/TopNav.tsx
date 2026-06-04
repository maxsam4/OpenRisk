"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./TopNav.module.css";

export function TopNav() {
  const pathname = usePathname() ?? "/";
  const isProtocols = pathname === "/" || pathname.startsWith("/protocol");
  const isMethodology = pathname.startsWith("/methodology");
  const isContribute = pathname.startsWith("/contribute");
  return (
    <div className={styles.topnav}>
      <div className={styles.topnavInner}>
        <Link className={styles.brand} href="/">
          <span className={styles.mark}>OpenRisk</span>
          <span className={styles.tag}>every feed, one view</span>
        </Link>
        <div className={styles.navlinks}>
          <Link className={`${styles.navlink}${isProtocols ? " " + styles.active : ""}`} href="/">
            Protocols
          </Link>
          <Link
            className={`${styles.navlink}${isMethodology ? " " + styles.active : ""}`}
            href="/methodology"
          >
            Methodology
          </Link>
          <Link
            className={`${styles.navlink}${isContribute ? " " + styles.active : ""}`}
            href="/contribute"
          >
            Contribute
          </Link>
          <a
            className={styles.navlink}
            href="https://github.com/maxsam4/OpenRisk"
            target="_blank"
            rel="noopener"
          >
            GitHub
          </a>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
