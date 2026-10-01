import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { Home, Search, ShoppingCart, Package, User } from "lucide-react-native";

const ACTIVE_COLOR = "#FF6B35";
const INACTIVE_COLOR = "#94A3B8";

export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      // Ürün detayı gizli bir sekme; geri tuşu/jesti bir önceki ekrana (Ana sayfa, Ara, Sepet…) dönsün
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarStyle: { borderTopColor: "#E2E8F0" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.home"),
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t("tabs.search"),
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: t("tabs.cart"),
          tabBarIcon: ({ color, size }) => <ShoppingCart color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: t("tabs.orders"),
          tabBarIcon: ({ color, size }) => <Package color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
      {/* Ürün detayı: sekme çubuğunda görünmez ama çubuk ekranda kalır */}
      <Tabs.Screen name="models/[id]" options={{ href: null }} />
    </Tabs>
  );
}
