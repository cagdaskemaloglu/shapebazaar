import { useState } from "react";
import { View, Text, FlatList, Image, Pressable, TextInput, Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { Trash2, ShoppingCart } from "lucide-react-native";
import { useCartStore, type CartItem } from "../../lib/cart";
import { useAuth } from "../../lib/auth/AuthProvider";
import { router } from "expo-router";

export default function CartScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { items, address, removeItem, setAddress, subtotal, shipping, grandTotal } = useCartStore();

  const [name, setName]         = useState(address.name);
  const [phone, setPhone]       = useState(address.phone);
  const [city, setCity]         = useState(address.city);
  const [district, setDistrict] = useState(address.district);
  const [line1, setLine1]       = useState(address.line1);

  function saveAddress() {
    setAddress({ name, phone, city, district, line1 });
  }

  function handleCheckout() {
    if (!user) {
      Alert.alert(t("cart.loginRequiredTitle"), t("cart.loginRequiredDesc"), [
        { text: t("cart.cancel"), style: "cancel" },
        { text: t("auth.loginBtn"), onPress: () => router.push("/auth/login") },
      ]);
      return;
    }
    // Web'deki CartDrawer ile aynı zorunlu alanlar: ad, şehir, adres
    if (!name.trim() || !city.trim() || !line1.trim()) {
      Alert.alert(t("cart.address"), t("cart.requiredFields"));
      return;
    }
    saveAddress();
    router.push("/checkout");
  }

  function renderItem({ item }: { item: CartItem }) {
    return (
      <View className="flex-row bg-white border border-slate-100 rounded-2xl p-3 mb-2.5">
        <View className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden">
          {item.thumbnailUrl ? (
            <Image source={{ uri: item.thumbnailUrl }} className="w-full h-full" resizeMode="cover" />
          ) : null}
        </View>
        <View className="flex-1 ml-3 justify-center">
          <Text numberOfLines={1} className="text-sm font-medium text-brand-dark">{item.modelTitle}</Text>
          <Text className="text-xs text-slate-400 mt-0.5">
            {item.material} · {item.colorName} · {item.scale}
          </Text>
          <Text className="text-sm font-semibold text-brand-orange mt-1">₺{item.itemTotal.toFixed(0)}</Text>
        </View>
        <Pressable onPress={() => removeItem(item.cartItemId)} className="justify-center px-1">
          <Trash2 size={16} color="#EF4444" />
        </Pressable>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View className="flex-1 bg-brand-light items-center justify-center px-6">
        <ShoppingCart color="#94A3B8" size={32} />
        <Text className="text-lg font-medium text-brand-dark mt-3 mb-1">{t("cart.emptyTitle")}</Text>
        <Text className="text-sm text-slate-500 text-center">{t("cart.emptyDesc")}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-brand-light pt-14">
      <Text className="text-xl font-semibold text-brand-dark px-4 mb-3">{t("tabs.cart")}</Text>

      <FlatList
        data={items}
        keyExtractor={(i) => i.cartItemId}
        renderItem={renderItem}
        contentContainerClassName="px-4"
        ListFooterComponent={
          <View className="mt-2">
            {/* Teslimat adresi */}
            <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 mt-4">
              {t("cart.address")}
            </Text>
            <TextInput
              value={name} onChangeText={setName} onBlur={saveAddress}
              placeholder={t("cart.fullName")}
              className="h-11 px-3 rounded-xl border border-slate-200 bg-white text-brand-dark mb-2"
            />
            <TextInput
              value={phone} onChangeText={setPhone} onBlur={saveAddress}
              placeholder={t("cart.phone")} keyboardType="phone-pad"
              className="h-11 px-3 rounded-xl border border-slate-200 bg-white text-brand-dark mb-2"
            />
            <View className="flex-row gap-2 mb-2">
              <TextInput
                value={city} onChangeText={setCity} onBlur={saveAddress}
                placeholder={t("cart.city")}
                className="flex-1 h-11 px-3 rounded-xl border border-slate-200 bg-white text-brand-dark"
              />
              <TextInput
                value={district} onChangeText={setDistrict} onBlur={saveAddress}
                placeholder={t("cart.district")}
                className="flex-1 h-11 px-3 rounded-xl border border-slate-200 bg-white text-brand-dark"
              />
            </View>
            <TextInput
              value={line1} onChangeText={setLine1} onBlur={saveAddress}
              placeholder={t("cart.addressLine")}
              multiline
              className="min-h-[60px] px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-brand-dark mb-4"
            />

            {/* Fiyat özeti */}
            <View className="bg-white border border-slate-200 rounded-2xl p-4 mb-4">
              <View className="flex-row justify-between mb-1.5">
                <Text className="text-sm text-slate-500">{t("cart.subtotal")}</Text>
                <Text className="text-sm text-brand-dark">₺{subtotal().toFixed(0)}</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-sm text-slate-500">{t("cart.shipping")}</Text>
                <Text className="text-sm text-brand-dark">₺{shipping().toFixed(0)}</Text>
              </View>
              <View className="flex-row justify-between border-t border-slate-100 pt-2">
                <Text className="text-sm font-semibold text-brand-dark">{t("cart.total")}</Text>
                <Text className="text-sm font-semibold text-brand-orange">₺{grandTotal().toFixed(0)}</Text>
              </View>
            </View>

            <Pressable
              onPress={handleCheckout}
              className="h-12 rounded-xl bg-brand-orange items-center justify-center mb-8"
            >
              <Text className="text-sm font-medium text-white">
                {t("cart.checkout")} — ₺{grandTotal().toFixed(0)}
              </Text>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}
