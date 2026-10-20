import path from 'node:path';
import fs from 'node:fs';

let envLoaded = false;

function ensureEnvLoaded() {
  if (envLoaded) return;
  envLoaded = true;
  const candidateFiles = [
    path.join(process.cwd(), '.env.local'),
    path.join(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../Arcade/.env.local'),
  ];
  for (const p of candidateFiles) {
    if (fs.existsSync(p)) {
      try {
        const content = fs.readFileSync(p, 'utf8');
        for (const line of content.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const k = trimmed.slice(0, eqIdx).trim();
            const v = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
            if (
              !process.env[k] &&
              (k.startsWith('AZURE_OPENAI_') ||
                k.startsWith('OPENAI_') ||
                k.startsWith('ANTHROPIC_'))
            ) {
              process.env[k] = v;
            }
          }
        }
      } catch {
        // Ignore unreadable env files
      }
    }
  }
}

export function getAiProviderStatus(): {
  configured: boolean;
  provider: 'azure-openai' | 'openai' | 'anthropic' | 'deterministic-engine';
  model: string;
} {
  ensureEnvLoaded();
  if (process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY) {
    return {
      configured: true,
      provider: 'azure-openai',
      model: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-5-mini',
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      configured: true,
      provider: 'openai',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      configured: true,
      provider: 'anthropic',
      model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest',
    };
  }
  return {
    configured: true,
    provider: 'deterministic-engine',
    model: 'magicpatterns-synth-v2',
  };
}

export async function callLlmCompletion(
  systemPrompt: string,
  userPrompt: string,
  timeoutMs = 8000
): Promise<{ ok: boolean; text: string; provider: string; model: string }> {
  ensureEnvLoaded();

  // 1. Azure OpenAI
  const azEndpoint = process.env.AZURE_OPENAI_ENDPOINT?.trim().replace(/\/+$/, '');
  const azKey = process.env.AZURE_OPENAI_API_KEY?.trim();
  const azDeployment = process.env.AZURE_OPENAI_DEPLOYMENT?.trim() || 'gpt-5-mini';
  const azVersion = process.env.AZURE_OPENAI_API_VERSION?.trim() || '2025-01-01-preview';

  if (azEndpoint && azKey) {
    const url = `${azEndpoint}/openai/deployments/${azDeployment}/chat/completions?api-version=${azVersion}`;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': azKey,
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_completion_tokens: 1500,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content?.trim() || '';
        if (content) {
          return {
            ok: true,
            text: content,
            provider: 'azure-openai',
            model: data?.model || azDeployment,
          };
        }
      }
    } catch {
      // Fall through to fallback
    }
  }

  // 2. OpenAI API
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  if (openAiKey) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 1500,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content?.trim() || '';
        if (content) {
          return {
            ok: true,
            text: content,
            provider: 'openai',
            model: data?.model || 'gpt-4o-mini',
          };
        }
      }
    } catch {
      // Fall through
    }
  }

  return {
    ok: false,
    text: '',
    provider: 'deterministic-engine',
    model: 'magicpatterns-synth-v2',
  };
}
