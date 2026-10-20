import { NextResponse } from 'next/server';
import { getAuthenticatedActor } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';

const MCP_TOOLS = [
  {
    name: 'list_projects',
    description: 'List all AI UI Design and Slide Deck projects in the authenticated Magic Patterns workspace.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['DESIGN', 'SLIDE_DECK'] },
      },
    },
  },
  {
    name: 'get_project_files',
    description: 'Fetch the complete React, TypeScript, and Tailwind CSS virtual file tree for a specific project ID or shareSlug.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID or shareSlug' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_design_system_tokens',
    description: 'Retrieve brand color tokens, typography rules, border radius, and custom CSS variables for a workspace Design System.',
    inputSchema: {
      type: 'object',
      properties: {
        designSystemId: { type: 'string', description: 'Optional Design System ID; defaults to workspace default system.' },
      },
    },
  },
  {
    name: 'get_magicos_canvas',
    description: 'Retrieve spatial PRD context nodes, connected GitHub repositories, and synthesized UI variants from a MagicOS canvas.',
    inputSchema: {
      type: 'object',
      properties: {
        canvasId: { type: 'string', description: 'Optional MagicOS Canvas ID; defaults to most recent canvas.' },
      },
    },
  },
];

export async function GET() {
  const actor = await getAuthenticatedActor();
  if (!actor) {
    return NextResponse.json(
      { ok: false, error: 'Authentication required. Pass Authorization: Bearer mp_live_...' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    ok: true,
    protocol: 'model-context-protocol',
    protocolVersion: '2024-11-05',
    serverInfo: {
      name: 'magicpatterns-mcp-server',
      version: '2.0.0',
    },
    workspaceId: actor.workspaceId,
    actorEmail: actor.email,
    tools: MCP_TOOLS,
  });
}

export async function POST(request: Request) {
  try {
    const actor = await getAuthenticatedActor();
    if (!actor) {
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          id: null,
          error: { code: -32001, message: 'Unauthorized: valid session or Workspace API Key required.' },
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const rpcId = body.id ?? 1;
    const method = String(body.method || '');
    const params = body.params || {};

    if (method === 'initialize') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id: rpcId,
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: {
            name: 'magicpatterns-mcp-server',
            version: '2.0.0',
          },
          capabilities: {
            tools: { listChanged: false },
            resources: { subscribe: false },
          },
        },
      });
    }

    if (method === 'tools/list') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id: rpcId,
        result: {
          tools: MCP_TOOLS,
        },
      });
    }

    if (method === 'tools/call') {
      const toolName = String(params.name || '');
      const args = params.arguments || {};

      await recordAuditLog({
        workspaceId: actor.workspaceId,
        actorId: actor.id,
        actorEmail: actor.email,
        action: 'mcp.tool.call',
        targetType: 'mcp',
        targetId: toolName,
        metadata: { arguments: args },
      });

      if (toolName === 'list_projects') {
        const projects = await prisma.designProject.findMany({
          where: {
            workspaceId: actor.workspaceId,
            ...(args.type ? { type: String(args.type) } : {}),
          },
          select: {
            id: true,
            shareSlug: true,
            name: true,
            prompt: true,
            type: true,
            model: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
          take: 25,
        });

        return NextResponse.json({
          jsonrpc: '2.0',
          id: rpcId,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(projects, null, 2),
              },
            ],
          },
        });
      }

      if (toolName === 'get_project_files') {
        const projectId = String(args.projectId || '');
        const project = await prisma.designProject.findFirst({
          where: {
            workspaceId: actor.workspaceId,
            OR: [{ id: projectId }, { shareSlug: projectId }],
          },
        });

        if (!project) {
          return NextResponse.json({
            jsonrpc: '2.0',
            id: rpcId,
            error: { code: -32602, message: `Project "${projectId}" not found.` },
          });
        }

        const files = JSON.parse(project.filesJson || '{}');
        return NextResponse.json({
          jsonrpc: '2.0',
          id: rpcId,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    id: project.id,
                    name: project.name,
                    prompt: project.prompt,
                    files,
                  },
                  null,
                  2
                ),
              },
            ],
          },
        });
      }

      if (toolName === 'get_design_system_tokens') {
        const dsId = args.designSystemId ? String(args.designSystemId) : undefined;
        const ds = dsId
          ? await prisma.designSystem.findFirst({
              where: { id: dsId, workspaceId: actor.workspaceId },
            })
          : await prisma.designSystem.findFirst({
              where: { workspaceId: actor.workspaceId },
              orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
            });

        if (!ds) {
          return NextResponse.json({
            jsonrpc: '2.0',
            id: rpcId,
            error: { code: -32602, message: 'No Design System found in workspace.' },
          });
        }

        return NextResponse.json({
          jsonrpc: '2.0',
          id: rpcId,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    id: ds.id,
                    name: ds.name,
                    radius: ds.radius,
                    colors: JSON.parse(ds.colorsJson || '{}'),
                    typography: JSON.parse(ds.typographyJson || '{}'),
                    customCss: ds.customCss,
                    components: JSON.parse(ds.componentsJson || '[]'),
                  },
                  null,
                  2
                ),
              },
            ],
          },
        });
      }

      if (toolName === 'get_magicos_canvas') {
        const canvasId = args.canvasId ? String(args.canvasId) : undefined;
        const canvas = canvasId
          ? await prisma.canvasProject.findFirst({
              where: { id: canvasId, workspaceId: actor.workspaceId },
            })
          : await prisma.canvasProject.findFirst({
              where: { workspaceId: actor.workspaceId },
              orderBy: { updatedAt: 'desc' },
            });

        if (!canvas) {
          return NextResponse.json({
            jsonrpc: '2.0',
            id: rpcId,
            error: { code: -32602, message: 'No MagicOS canvas found.' },
          });
        }

        return NextResponse.json({
          jsonrpc: '2.0',
          id: rpcId,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    id: canvas.id,
                    name: canvas.name,
                    nodes: JSON.parse(canvas.nodesJson || '[]'),
                    edges: JSON.parse(canvas.edgesJson || '[]'),
                  },
                  null,
                  2
                ),
              },
            ],
          },
        });
      }

      return NextResponse.json({
        jsonrpc: '2.0',
        id: rpcId,
        error: { code: -32601, message: `Unknown MCP tool: ${toolName}` },
      });
    }

    return NextResponse.json({
      jsonrpc: '2.0',
      id: rpcId,
      error: { code: -32601, message: `Unsupported JSON-RPC method: ${method}` },
    });
  } catch (error) {
    console.error('MCP server error:', error);
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32603, message: 'Internal MCP server error' },
      },
      { status: 500 }
    );
  }
}
