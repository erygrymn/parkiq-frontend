import { create } from 'zustand';

// §7.9 Vehicle: araç = profil (ad + opsiyonel plaka).
// GİZLİLİK KURALI (bağlayıcı): plaka hiçbir karta, paylaşıma veya ekran görüntüsü
// yüzeyine ÇIKMAZ — yalnız Ayarlar'da düzenlenir.
// Tek oturum kuralı korunur: çoklu araç paralel oturum açmaz (§7 mimari).

export interface Vehicle {
  id: string;
  name: string;
  plate: string;
}

interface VehicleStore {
  vehicles: Vehicle[];
  activeVehicleId: string | null;
  hydrate: () => void;
  addVehicle: (name: string) => void;
  updateVehicle: (id: string, patch: Partial<Omit<Vehicle, 'id'>>) => void;
  removeVehicle: (id: string) => void;
  setActiveVehicle: (id: string) => void;
}

const VEHICLES_KEY = 'vehicles';
const ACTIVE_KEY = 'activeVehicleId';

function repo() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../db/sessionRepo') as typeof import('../db/sessionRepo');
}

function persist(vehicles: Vehicle[], activeVehicleId: string | null): void {
  try {
    repo().writeSetting(VEHICLES_KEY, JSON.stringify(vehicles));
    repo().writeSetting(ACTIVE_KEY, activeVehicleId ?? '');
  } catch {
    // Kalıcılık başarısızsa araçlar oturum boyunca bellekte kalır.
  }
}

export const useVehicleStore = create<VehicleStore>((set, get) => ({
  vehicles: [],
  activeVehicleId: null,

  hydrate: () => {
    try {
      const raw = repo().readSetting(VEHICLES_KEY);
      const parsed = raw ? (JSON.parse(raw) as Vehicle[]) : [];
      const vehicles = Array.isArray(parsed) ? parsed.filter((v) => v && typeof v.id === 'string') : [];
      const stored = repo().readSetting(ACTIVE_KEY);
      const activeVehicleId = vehicles.some((v) => v.id === stored) ? stored : vehicles[0]?.id ?? null;
      set({ vehicles, activeVehicleId });
    } catch {
      set({ vehicles: [], activeVehicleId: null });
    }
  },

  addVehicle: (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const vehicle: Vehicle = { id: `v${Date.now()}`, name: trimmed, plate: '' };
    const vehicles = [...get().vehicles, vehicle];
    const activeVehicleId = get().activeVehicleId ?? vehicle.id;
    persist(vehicles, activeVehicleId);
    set({ vehicles, activeVehicleId });
  },

  updateVehicle: (id, patch) => {
    const vehicles = get().vehicles.map((v) => (v.id === id ? { ...v, ...patch } : v));
    persist(vehicles, get().activeVehicleId);
    set({ vehicles });
  },

  removeVehicle: (id) => {
    const vehicles = get().vehicles.filter((v) => v.id !== id);
    const activeVehicleId = get().activeVehicleId === id ? vehicles[0]?.id ?? null : get().activeVehicleId;
    persist(vehicles, activeVehicleId);
    set({ vehicles, activeVehicleId });
  },

  setActiveVehicle: (activeVehicleId) => {
    persist(get().vehicles, activeVehicleId);
    set({ activeVehicleId });
  },
}));
