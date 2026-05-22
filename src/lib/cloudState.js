import { supabase } from "./supabaseClient";

const ROW_ID = "main";

export function toCloudState(state) {
  const { user, ...globalState } = state;
  return globalState;
}

export async function loadCloudState() {
  if (!supabase) return null;

  const { data, error } = await supabase.from("crybet_state").select("data").eq("id", ROW_ID).maybeSingle();

  if (error) {
    console.warn("CRYBET Supabase load failed:", error.message);
    return null;
  }

  return data?.data ?? null;
}

export async function saveCloudState(state) {
  if (!supabase) return;

  const { error } = await supabase.from("crybet_state").upsert({
    id: ROW_ID,
    data: toCloudState(state),
    updated_at: new Date().toISOString()
  });

  if (error) {
    console.warn("CRYBET Supabase save failed:", error.message);
  }
}

export function subscribeCloudState(onState) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel("crybet-state")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "crybet_state", filter: `id=eq.${ROW_ID}` },
      (payload) => {
        if (payload.new?.data) onState(payload.new.data);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
