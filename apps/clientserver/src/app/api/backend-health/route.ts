import { NextResponse } from 'next/server';

export async function GET() {
  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:4000';
  try {
    const response = await fetch(`${backendUrl}/api/health`, { cache: 'no-store' });
    const data = await response.json();
    return NextResponse.json({ connected: response.ok, backend: data }, { status: response.ok ? 200 : 502 });
  } catch {
    return NextResponse.json(
      { connected: false, message: 'Backend is not reachable. Start apps/backend on port 4000.' },
      { status: 503 },
    );
  }
}
