import { api } from "@acme/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { ScrollView, Text, View } from "react-native";
import { Container } from "@/components/container";

export default function Home() {
  const healthCheck = useQuery(api.healthCheck.get);

  return (
    <Container>
      <ScrollView className="flex-1">
        <View className="px-4">
          <Text className="font-mono text-foreground text-3xl font-bold mb-4">
            BETTER T STACK
          </Text>

          <View className="bg-card border border-border rounded-xl p-6 mb-6 shadow-sm">
            <View className="flex-row items-center gap-3">
              <View
                className={`h-3 w-3 rounded-full ${
                  healthCheck ? "bg-green-500" : "bg-orange-500"
                }`}
              />
              <View className="flex-1">
                <Text className="text-sm font-medium text-card-foreground">
                  Convex
                </Text>
                <Text className="text-muted-foreground">
                  {healthCheck === undefined
                    ? "Checking..."
                    : healthCheck === "OK"
                      ? "Connected to API"
                      : "API Disconnected"}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </Container>
  );
}
