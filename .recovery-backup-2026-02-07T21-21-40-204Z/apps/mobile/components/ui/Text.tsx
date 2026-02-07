import React from "react";
import { Text as RNText, TextProps } from "react-native";

type TextVariant =
  | "display"
  | "hero"
  | "title"
  | "heading"
  | "subheading"
  | "body-lg"
  | "body"
  | "small"
  | "caption"
  | "label";

interface ThemedTextProps extends TextProps {
  variant?: TextVariant;
}

const variantClasses: Record<TextVariant, string> = {
  display: "font-display-bold text-5xl tracking-tighter text-text-primary",
  hero: "font-display-bold text-4xl tracking-tight text-text-primary",
  title: "font-display-semibold text-3xl tracking-tight text-text-primary",
  heading: "font-display-semibold text-2xl text-text-primary",
  subheading: "font-display-semibold text-xl text-text-primary",
  "body-lg": "font-sans text-xl text-text-primary",
  body: "font-sans text-lg text-text-primary",
  small: "font-sans text-base text-text-secondary",
  caption: "font-sans-medium text-sm uppercase tracking-widest text-text-tertiary",
  label: "font-sans-semibold text-base tracking-wide text-text-secondary",
};

export function ThemedText({ variant = "body", className = "", ...props }: ThemedTextProps) {
  return <RNText className={`${variantClasses[variant]} ${className}`} {...props} />;
}
