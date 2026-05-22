import { TextInput, View, Text } from "react-native";

export default function InputField({ label, ...props }) {
  return (
    <View className="mb-4">
      {label && <Text className="text-textSecondary mb-2 font-medium">{label}</Text>}
      <TextInput
        {...props}
        placeholderTextColor="#6C737F"
        className="border border-gray-300 bg-surface p-4 rounded-xl text-textPrimary"
      />
    </View>
  );
}
