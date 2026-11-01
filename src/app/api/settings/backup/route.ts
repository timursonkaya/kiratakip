import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createBackup } from '@/lib/backup/createBackup';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

    const { data, filename } = await createBackup(session.id);

    return new NextResponse(data as unknown as BodyInit, {
      headers: {
        'Content-Type':        'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length':      String(data.length),
      },
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
