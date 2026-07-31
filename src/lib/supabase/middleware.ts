import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database, UserRole } from "@/lib/types/database.types";

function getRole(appMetadata: Record<string, unknown> | undefined): UserRole | undefined {
  return (appMetadata as { role?: UserRole } | undefined)?.role;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() revalida o token contra o Auth server. app_metadata.role vem do
  // raw_app_meta_data setado na criação do usuário (ver handle_new_user na migration).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = getRole(user?.app_metadata as Record<string, unknown> | undefined);

  const { pathname } = request.nextUrl;
  const isAdminRoute = pathname.startsWith("/admin");
  const isMembroRoute = pathname.startsWith("/membro");

  if ((isAdminRoute || isMembroRoute) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isAdminRoute && role !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/membro/dashboard";
    return NextResponse.redirect(url);
  }

  if (isMembroRoute && role !== "membro") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
