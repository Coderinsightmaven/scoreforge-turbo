"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import styles from "./AuthScreen.module.css";

export function UserMenu() {
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.currentUser);

  if (user === undefined) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.loadingSpinner} />
        <span>Loading...</span>
      </div>
    );
  }

  if (user === null) {
    return null;
  }

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email?.[0]?.toUpperCase() || "?";

  return (
    <div className={styles.userCard}>
      <div className={styles.userAvatar}>{initials}</div>
      <h2 className={styles.userGreeting}>WELCOME BACK</h2>
      <div className={styles.userInfo}>
        {user.name && (
          <div className={styles.userInfoItem}>
            <span className={styles.userInfoLabel}>Name</span>
            <span className={styles.userInfoValue}>{user.name}</span>
          </div>
        )}
        <div className={styles.userInfoItem}>
          <span className={styles.userInfoLabel}>Email</span>
          <span className={styles.userInfoValue}>{user.email}</span>
        </div>
      </div>
      <button onClick={() => signOut()} className={styles.signOutButton}>
        Sign Out
      </button>
    </div>
  );
}
