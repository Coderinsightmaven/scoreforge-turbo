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
        <Text className="mb-1.5 font-sans-semibold text-sm tracking-wide text-editorial-text-secondary">
          {label}
        </Text>
      )}
      <TextInput
        className={`rounded-lg border border-editorial-border bg-white px-4 py-3 font-sans text-base text-editorial-text-primary ${
          error ? "border-editorial-error" : "focus:border-brand"
        } ${className}`}
        placeholderTextColor="#737373"
        {...props}
      />
      {error && <Text className="mt-1 font-sans text-sm text-editorial-error">{error}</Text>}
    </View>
  );
}
