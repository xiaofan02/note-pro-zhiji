import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type UserRole = "free" | "pro" | "admin";

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole>("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole("free");
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      const { data, error } = await supabase.rpc("get_user_role", { _user_id: user.id });
      if (!error && data) {
        setRole(data as UserRole);
      }
      setLoading(false);
    };

    fetchRole();
  }, [user]);

  const isPro = role === "pro" || role === "admin";
  const isAdmin = role === "admin";

  return { role, isPro, isAdmin, loading };
}
