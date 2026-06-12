import { create } from "zustand";

export type RolePreview = "proposal_manager" | "sme" | "compliance_auditor";

interface UiState {
  role: RolePreview;
  setRole: (r: RolePreview) => void;
}

export const useUiStore = create<UiState>((set) => ({
  role: "proposal_manager",
  setRole: (role) => set({ role }),
}));

export const can = {
  create: (r: RolePreview) => r === "proposal_manager",
  assign: (r: RolePreview) => r === "proposal_manager",
  deleteAny: (r: RolePreview) => r === "proposal_manager",
  editSection: (r: RolePreview) => r === "proposal_manager" || r === "sme",
  comment: (r: RolePreview) => r === "proposal_manager" || r === "sme",
  approveReject: (r: RolePreview) => r === "proposal_manager" || r === "compliance_auditor",
};