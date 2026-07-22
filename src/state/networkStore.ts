import * as Network from 'expo-network';
import { create } from 'zustand';

// §5.11 offline satırı. Sayaç ve tarife matematiği tamamen cihazda çalıştığı için
// çevrimdışı olmak ürünü DURDURMAZ — satırın işi bunu söylemek: "sayaç çalışıyor".

interface NetworkStore {
  online: boolean;
  subscribe: () => () => void;
}

export const useNetworkStore = create<NetworkStore>((set) => ({
  online: true,

  subscribe: () => {
    let subscription: { remove: () => void } | null = null;
    try {
      void Network.getNetworkStateAsync().then((state) =>
        set({ online: state.isInternetReachable !== false }),
      );
      subscription = Network.addNetworkStateListener((state) =>
        set({ online: state.isInternetReachable !== false }),
      );
    } catch {
      set({ online: true }); // Ağ katmanı okunamıyorsa kullanıcıyı yanıltma
    }
    return () => subscription?.remove();
  },
}));
