import { Text, TouchableOpacity } from "react-native";

export default function CustomButton({ title, onPress, variant = "primary", className = "" }) {
  const isOutline = variant === "outline";
  
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`p-4 rounded-xl items-center justify-center ${
        isOutline ? "border-2 border-primary bg-transparent" : "bg-primary"
      } ${className}`}
    >
      <Text className={`text-base font-bold ${isOutline ? "text-primary" : "text-white"}`}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}
