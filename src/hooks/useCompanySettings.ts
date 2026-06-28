import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MealRates, ForeignMealRate } from "@/lib/travel/calc";

export type TravelOverrides = {
  meal_rates_override: Record<string, MealRates> | null;
  foreign_meal_rates_override: Record<string, Record<string, ForeignMealRate>> | null;
  fuel_price_override: Record<string, number> | null;
  km_rate_override: Record<string, number> | null;
};

export type CompanySettingsRow = TravelOverrides & { id: string };

export function useCompanySettings() {
  const [data, setData] = useState<CompanySettingsRow | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: row } = await supabase
      .from("company_settings")
      .select("id, meal_rates_override, foreign_meal_rates_override, fuel_price_override, km_rate_override")
      .limit(1)
      .maybeSingle();
    if (row) {
      setData({
        id: row.id,
        meal_rates_override: (row.meal_rates_override as any) || null,
        foreign_meal_rates_override: (row.foreign_meal_rates_override as any) || null,
        fuel_price_override: (row.fuel_price_override as any) || null,
        km_rate_override: (row.km_rate_override as any) || null,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const saveOverrides = useCallback(async (patch: Partial<TravelOverrides>) => {
    if (!data?.id) {
      const { data: row, error } = await supabase
        .from("company_settings")
        .insert({ name: "", ...patch } as any)
        .select()
        .single();
      if (error) throw error;
      await refresh();
      return row;
    }
    const { error } = await supabase
      .from("company_settings")
      .update(patch as any)
      .eq("id", data.id);
    if (error) throw error;
    await refresh();
  }, [data?.id, refresh]);

  return { data, loading, refresh, saveOverrides };
}