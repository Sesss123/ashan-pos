import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface BranchState {
  selectedBranchId: string;
  setSelectedBranchId: (branchId: string) => void;
}

export const useBranchStore = create<BranchState>()(
  persist(
    (set) => ({
      selectedBranchId: 'all',
      setSelectedBranchId: (branchId) => {
        set({ selectedBranchId: branchId });
        // Reload page to re-fetch all queries with the new branch filter
        window.location.reload();
      },
    }),
    {
      name: 'ashn-admin-branch', // unique name for localStorage key
    }
  )
);
