export interface ExtractedDesignTokens {
  extractedLive: boolean;
  sourceUrl: string;
  colors: Record<string, string>;
  typography: Record<string, string>;
  radius: string;
  customCss: string;
  components: Array<{ name: string; variants: string[]; status: string }>;
}

const HEX_REGEX = /#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;

export async function extractDesignTokensFromSource(
  sourceType: string,
  rawUrl: string | null,
  fallbackColors: Record<string, string>,
  fallbackTypography: Record<string, string>,
  fallbackRadius: string
): Promise<ExtractedDesignTokens> {
  const defaultComponents = [
    { name: 'Button', variants: ['Primary', 'Secondary', 'Outline', 'Ghost'], status: 'Ready' },
    { name: 'Card', variants: ['Default', 'Interactive', 'Metric'], status: 'Ready' },
    { name: 'Badge', variants: ['Positive', 'Warning', 'Neutral'], status: 'Ready' },
    { name: 'Modal', variants: ['Dialog', 'Drawer'], status: 'Ready' },
  ];

  if (!rawUrl || (sourceType !== 'website' && sourceType !== 'github')) {
    return {
      extractedLive: false,
      sourceUrl: rawUrl || '',
      colors: fallbackColors,
      typography: fallbackTypography,
      radius: fallbackRadius,
      customCss: `:root {\n  --radius: ${fallbackRadius};\n  --primary: ${fallbackColors.primary || '#0F172A'};\n  --accent: ${fallbackColors.accent || '#4F46E5'};\n}`,
      components: defaultComponents,
    };
  }

  const normalizedUrl = /^https?:\/\//i.test(rawUrl.trim())
    ? rawUrl.trim()
    : sourceType === 'github' && !rawUrl.includes('.')
    ? `https://github.com/${rawUrl.trim()}`
    : `https://${rawUrl.trim()}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(normalizedUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; MagicPatternsTokenExtractor/2.0; +https://www.magicpatterns.com)',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const html = await res.text();
      const hexMatches = Array.from(
        new Set((html.match(HEX_REGEX) || []).map((h) => h.toUpperCase()))
      ).filter(
        (h) =>
          h.length === 7 &&
          h !== '#FFFFFF' &&
          h !== '#000000' &&
          h !== '#F8FAFC' &&
          h !== '#E2E8F0'
      );

      const primary = hexMatches[0] || fallbackColors.primary || '#0F172A';
      const accent = hexMatches[1] || fallbackColors.accent || '#4F46E5';

      // Check for Google Fonts or font-family declarations in the HTML
      const fontMatch = html.match(/family=([A-Za-z+]+)/i);
      const detectedFont = fontMatch
        ? decodeURIComponent(fontMatch[1].replace(/\+/g, ' '))
        : fallbackTypography.headingFont || 'Inter';

      const colors = {
        ...fallbackColors,
        primary,
        accent,
      };
      const typography = {
        ...fallbackTypography,
        headingFont: detectedFont,
      };

      return {
        extractedLive: true,
        sourceUrl: normalizedUrl,
        colors,
        typography,
        radius: fallbackRadius,
        customCss: `/* Extracted live from ${normalizedUrl} */\n:root {\n  --radius: ${fallbackRadius};\n  --primary: ${primary};\n  --accent: ${accent};\n  --font-heading: '${detectedFont}', sans-serif;\n}`,
        components: defaultComponents,
      };
    }
  } catch {
    // Graceful fallback when target URL blocks scraping or is offline
  }

  return {
    extractedLive: false,
    sourceUrl: normalizedUrl,
    colors: fallbackColors,
    typography: fallbackTypography,
    radius: fallbackRadius,
    customCss: `:root {\n  --radius: ${fallbackRadius};\n  --primary: ${fallbackColors.primary || '#0F172A'};\n  --accent: ${fallbackColors.accent || '#4F46E5'};\n}`,
    components: defaultComponents,
  };
}
