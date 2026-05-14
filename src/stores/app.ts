import { defineStore } from 'pinia';

interface AppState {
  loading: boolean;
  currentKbId: number | null;
}

export const useAppStore = defineStore('app', {
  state: (): AppState => ({
    loading: false,
    currentKbId: null,
  }),
  actions: {
    setLoading(v: boolean) {
      this.loading = v;
    },
    setCurrentKb(id: number | null) {
      this.currentKbId = id;
    },
  },
});
