/**
 * roteiro/[id].tsx — Static template itineraries removed.
 *
 * Pre-built roteiros (r1, r2, r3, r4) were fake mock data that violated
 * the "Supabase is the only source of truth" rule.
 * All itineraries must come from Supabase or be AI-generated.
 * This screen now redirects to the AI roteiro generator.
 */
import { Redirect } from "expo-router";

export default function RoteiroStaticDetail() {
  return <Redirect href="/roteiro" />;
}
