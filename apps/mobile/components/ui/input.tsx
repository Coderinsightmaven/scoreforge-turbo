import * as React from "react";
import { TextInput, StyleSheet, type TextInputProps, type ViewStyle } from "react-native";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { Fonts } from "@/constants/colors";

export type InputProps = TextInputProps & {
  style?: ViewStyle;
};

export const Input = React.forwardRef<TextInput, InputProps>(
  ({ style, placeholderTextColor, editable = true, ...props }, ref) => {
    const colors = useThemeColors();
    const resolvedPlaceholder = placeholderTextColor ?? colors.textLight;

    return (
      <TextInput
        ref={ref}
        editable={editable}
        placeholderTextColor={resolvedPlaceholder}
        style={[
          styles.input,
          {
            borderColor: colors.border,
            backgroundColor: colors.bgSecondary,
            color: colors.textPrimary,
          },
          !editable && styles.disabled,
          style,
        ]}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

const styles = StyleSheet.create({
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: Fonts.sans,
  },
  disabled: {
    opacity: 0.6,
  },
});
