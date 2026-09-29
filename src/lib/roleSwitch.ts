import type { AppRole } from "@/contexts/AuthContext";

export const roleLabels: Record<string, string> = {
  admin: "Admin",
  dispatcer: "Dispečer",
  ridic: "Řidič",
};

export const roleDescriptions: Record<string, string> = {
  admin: "Plná správa vozového parku a nastavení",
  dispatcer: "Rezervace, schvalování a provoz vozidel",
  ridic: "Moje rezervace, jízdy a přiřazený vůz",
};

/** Cílová stránka po zvolení role. */
export function homeForRole(role: AppRole, isMobile: boolean) {
  if (role === "ridic") return isMobile ? "/m" : "/ridic";
  return isMobile ? "/m" : "/";
}
