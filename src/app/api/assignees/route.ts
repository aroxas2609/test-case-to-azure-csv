import { NextResponse } from "next/server";

function parseOptions(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  const configuredPassword = process.env.ASSIGNEES_PASSWORD;
  const options = parseOptions(process.env.ASSIGNED_TO_OPTIONS_JSON);

  if (!configuredPassword || options.length === 0) {
    return NextResponse.json({ message: "Assignees are not configured." }, { status: 503 });
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (password !== configuredPassword) {
    return NextResponse.json({ message: "Incorrect password." }, { status: 401 });
  }

  return NextResponse.json({ options });
}

