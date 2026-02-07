import React from "react";
import { TextInput, TextInputProps, View, Text } from "react-native";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <View>
      {label && (
        <Text className="mb-1.5 font-sans-semibold text-sm tracking-wide text-text-secondary">
          {label}
        </Text>
      )}
      <TextInput
        className={`rounded-xl border-2 border-slate-200 bg-white px-5 py-4 font-sans text-base text-text-primary ${
          error ? "border-red-500" : "focus:border-brand"
        } ${className}`}
        placeholderTextColor="#94A3B8"
        {...props}
      />
      {error && <Text className="mt-1 font-sans text-sm text-red-500">{error}</Text>}
    </View>
  );
}
