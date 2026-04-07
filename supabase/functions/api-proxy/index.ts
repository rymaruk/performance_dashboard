import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.101.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const { url, token, auth_header: authH = "Authorization", auth_prefix = "Bearer " } = await req.json();

    if (!url || !token) {
      return jsonResponse({ error: "Missing url or token" }, 400);
    }

    // Proxy a single request to the external API
    const apiRes = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        [authH]: `${auth_prefix}${token}`,
      },
    });

    const body = await apiRes.text();

    return new Response(body, {
      status: apiRes.status,
      headers: {
        ...corsHeaders,
        "Content-Type": apiRes.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
