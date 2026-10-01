import AsyncStorage from "@react-native-async-storage/async-storage";
import { createCartStore, buildCartItem, type CartItem } from "@shapebazaar/shared";

export type { CartItem };
export { buildCartItem };

export const useCartStore = createCartStore(AsyncStorage);
