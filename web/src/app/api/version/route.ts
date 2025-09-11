import { NextResponse } from "next/server";

export async function GET() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA || null;
  const branch = process.env.VERCEL_GIT_COMMIT_REF || null;
  const message = process.env.VERCEL_GIT_COMMIT_MESSAGE || null;
  const url = process.env.VERCEL_URL || null;
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME || null;
  return NextResponse.json({
    sha,
    short: sha ? sha.substring(0, 7) : null,
    branch,
    message,
    vercelUrl: url,
    buildTime,
  });
}
