import React from 'react';
import { Text as RNText, TextProps } from 'react-native';

type TextVariant = 'display' | 'hero' | 'title' | 'heading' | 'subheading' | 'body-lg' | 'body' | 'small' | 'caption' | 'label';

interface ThemedTextProps extends TextProps {
  variant?: TextVariant;
}

const variantClasses: Record<TextVariant, string> = {
  display: 'font-display-bold text-4xl tracking-tighter text-editorial-text-primary',
  hero: 'font-display-bold text-3xl tracking-tight text-editorial-text-primary',
  title: 'font-display-semibold text-2xl tracking-tight text-editorial-text-primary',
  heading: 'font-display-semibold text-xl text-editorial-text-primary',
  subheading: 'font-display-semibold text-lg text-editorial-text-primary',
  'body-lg': 'font-sans text-lg text-editorial-text-primary',
  body: 'font-sans text-base text-editorial-text-primary',
  small: 'font-sans text-sm text-editorial-text-secondary',
  caption: 'font-sans-medium text-xs uppercase tracking-widest text-editorial-text-muted',
  label: 'font-sans-semibold text-sm tracking-wide text-editorial-text-secondary',
};

export function ThemedText({ variant = 'body', className = '', ...props }: ThemedTextProps) {
  return (
    <RNText className={`${variantClasses[variant]} ${className}`} {...props} />
  );
}
