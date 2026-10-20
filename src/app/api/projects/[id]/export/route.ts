import { NextResponse } from 'next/server';
import { getAuthenticatedActor } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';

// Pure Node.js CRC-32 & uncompressed ZIP builder so zero native zip dependencies are required
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildZipArchive(entries: Array<{ name: string; content: Buffer }>): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const dataBuf = entry.content;
    const crc = crc32(dataBuf);

    // Local file header (30 bytes + filename)
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // signature
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0, 6); // flags
    localHeader.writeUInt16LE(0, 8); // compression = 0 (store)
    localHeader.writeUInt16LE(0, 10); // mod time
    localHeader.writeUInt16LE(0, 12); // mod date
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(dataBuf.length, 18);
    localHeader.writeUInt32LE(dataBuf.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28); // extra len

    localParts.push(localHeader, nameBuf, dataBuf);

    // Central directory header (46 bytes + filename)
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0); // signature
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(dataBuf.length, 20);
    centralHeader.writeUInt32LE(dataBuf.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuf);
    offset += 30 + nameBuf.length + dataBuf.length;
  }

  const centralDirBuf = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDirBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirBuf, eocd]);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getAuthenticatedActor();
    if (!actor) {
      return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
    }

    const { id } = await context.params;
    const project = await prisma.designProject.findFirst({
      where: { OR: [{ id }, { shareSlug: id }] },
    });

    if (!project) {
      return NextResponse.json({ ok: false, error: 'Project not found.' }, { status: 404 });
    }

    const filesMap: Record<string, { path: string; content: string }> = JSON.parse(
      project.filesJson || '{}'
    );
    const screens: Array<{ name: string; htmlPreview: string }> = JSON.parse(
      project.screensJson || '[]'
    );

    const entries: Array<{ name: string; content: Buffer }> = [];

    for (const [filePath, fileObj] of Object.entries(filesMap)) {
      entries.push({
        name: `src/${filePath.replace(/^\/+/, '')}`,
        content: Buffer.from(fileObj.content || '', 'utf8'),
      });
    }

    if (screens[0]?.htmlPreview) {
      entries.push({
        name: 'preview/index.html',
        content: Buffer.from(screens[0].htmlPreview, 'utf8'),
      });
    }

    entries.push({
      name: 'package.json',
      content: Buffer.from(
        JSON.stringify(
          {
            name: project.shareSlug,
            version: '1.0.0',
            private: true,
            dependencies: {
              react: '^19.0.0',
              'react-dom': '^19.0.0',
              'lucide-react': '^1.0.0',
              tailwindcss: '^3.4.0',
            },
          },
          null,
          2
        ),
        'utf8'
      ),
    });

    entries.push({
      name: 'README.md',
      content: Buffer.from(
        `# ${project.name}\n\nGenerated with Magic Patterns.\n\n## Prompt\n${project.prompt}\n`,
        'utf8'
      ),
    });

    const zipBuffer = buildZipArchive(entries);

    await recordAuditLog({
      workspaceId: actor.workspaceId,
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'project.export.zip',
      targetType: 'project',
      targetId: project.id,
      metadata: { shareSlug: project.shareSlug, filesCount: entries.length },
    });

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${project.shareSlug}.zip"`,
        'Content-Length': String(zipBuffer.length),
      },
    });
  } catch (error) {
    console.error('Export project ZIP error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to export project.' }, { status: 500 });
  }
}
