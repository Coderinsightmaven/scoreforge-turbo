import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function OrganizationLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.bgPrimary },
        animation: 'slide_from_right',
      }}
    />
  );
}
