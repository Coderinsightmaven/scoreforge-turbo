"use client";

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useState } from "react";
import { SignInForm } from "./SignInForm";
import { SignUpForm } from "./SignUpForm";
import { UserMenu } from "./UserMenu";
import styles from "./AuthScreen.module.css";

export function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);

  return (
    <div className={styles.authWrapper}>
      <AuthLoading>
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner} />
          <span>Loading...</span>
        </div>
      </AuthLoading>

      <Unauthenticated>
        {isSignUp ? (
          <SignUpForm onToggle={() => setIsSignUp(false)} />
        ) : (
          <SignInForm onToggle={() => setIsSignUp(true)} />
        )}
      </Unauthenticated>

      <Authenticated>
        <UserMenu />
      </Authenticated>
    </div>
  );
}
