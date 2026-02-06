import React from 'react';
import { TextInput, TextInputProps, View, Text } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <View>
      {label && (
        <Text className="font-sans-semibold text-sm text-editorial-text-secondary mb-1.5 tracking-wide">
          {label}
        </Text>
      )}
      <TextInput
        className={`font-sans text-base text-editorial-text-primary bg-white border border-editorial-border rounded-lg px-4 py-3 ${
          error ? 'border-editorial-error' : 'focus:border-brand'
        } ${className}`}
        placeholderTextColor="#737373"
        {...props}
      />
      {error && (
        <Text className="font-sans text-sm text-editorial-error mt-1">{error}</Text>
      )}
    </View>
  );
}
