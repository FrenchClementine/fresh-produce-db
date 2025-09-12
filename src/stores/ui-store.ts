import { create } from 'zustand'

type MapView = 'list' | 'map' | 'hybrid'

interface UIStore {
  mapView: MapView
  selectedSuppliers: string[]
  sidebarOpen: boolean
  setMapView: (view: MapView) => void
  toggleSupplierSelection: (id: string) => void
  toggleSidebar: () => void
  clearSelection: () => void
}

export const useUIStore = create<UIStore>((set, get) => ({
  mapView: 'list',
  selectedSuppliers: [],
  sidebarOpen: false,
  setMapView: (view) => set({ mapView: view }),
  toggleSupplierSelection: (id) => {
    const current = get().selectedSuppliers
    set({
      selectedSuppliers: current.includes(id)
        ? current.filter(x => x !== id)
        : [...current, id]
    })
  },
  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
  clearSelection: () => set({ selectedSuppliers: [] })
}))

