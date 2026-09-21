import { NextResponse } from "next/server";

import AuthService from "@/services/AuthService";
import MSGraphService from "@/services/MSGraphService";

export const dynamic = "force-dynamic";

const PROFILE_PHOTO_SIZE = 48;

function errorStatus(error: unknown): number | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  ) {
    return error.statusCode;
  }

  return undefined;
}

export async function GET(): Promise<Response> {
  const authService = new AuthService();

  if (!authService.isEnabled()) {
    return new Response(null, { status: 404 });
  }

  const session = await authService.getSession();

  if (!session?.user.oid) {
    return new Response(null, { status: 404 });
  }

  try {
    const graph = new MSGraphService().getMSGraphClient();
    const response: Blob = await graph
      .api(
        `/users/${session.user.oid}/photos/${PROFILE_PHOTO_SIZE}x${PROFILE_PHOTO_SIZE}/$value`,
      )
      .get();

    return new NextResponse(response);
  } catch (error) {
    if (errorStatus(error) === 404) {
      return new Response(null, { status: 404 });
    }

    console.error("Profile image request failed", {
      route: "/api/profile-image",
    });
    return new Response(null, { status: 502 });
  }
}
