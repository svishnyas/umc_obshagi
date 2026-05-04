import { create } from "zustand";

export type DormFilter = "all" | "1" | "2" | "3";
export type FeedTab = "new" | "pop" | "ev" | "lost";

type UiState = {
  dorm: DormFilter;
  feedTab: FeedTab;
  search: string;
  setDorm: (d: DormFilter) => void;
  setFeedTab: (t: FeedTab) => void;
  setSearch: (s: string) => void;
};

export const useUiStore = create<UiState>((set) => ({
  dorm: "all",
  feedTab: "new",
  search: "",
  setDorm: (dorm) => set({ dorm }),
  setFeedTab: (feedTab) => set({ feedTab }),
  setSearch: (search) => set({ search }),
}));
