import { describe, expect, it } from 'vitest';
import { hasLeakedToolCall, hideLeakedToolCalls, stripLeakedToolCall } from './leaked-tool-call';

// The exact reply moonshotai/kimi-k3 (TokenGo) produced instead of a <boltArtifact>.
const leaked =
  "I'll create a Privacy Policy page with the same design system, add the route, and wire it into the footer." +
  '<|open|>tools<|sep|><|open|>call tool="boltArtifact" index="1"<|sep|><|open|>argument key="id" type="string"<|sep|>d2-media-website<|close|>argument<|sep|><|close|>call<|sep|><|close|>tools<|sep|><|close|>message<|sep|>';

describe('leaked tool calls', () => {
  it('detects the Kimi tool-call leak', () => {
    expect(hasLeakedToolCall(leaked)).toBe(true);
  });

  it('ignores normal replies, including ones that mention tools', () => {
    expect(hasLeakedToolCall('I used a few tools to <boltArtifact id="x" title="y"></boltArtifact>')).toBe(false);
  });

  it('keeps the text written before the tool call for the retry', () => {
    expect(stripLeakedToolCall(leaked)).toBe(
      "I'll create a Privacy Policy page with the same design system, add the route, and wire it into the footer.",
    );
  });

  it('hides the tokens in the chat while keeping the continuation', () => {
    const continued = leaked + '<boltArtifact id="d2" title="Privacy">…</boltArtifact>';
    expect(hideLeakedToolCalls(continued)).toBe(
      "I'll create a Privacy Policy page with the same design system, add the route, and wire it into the footer." +
        '<boltArtifact id="d2" title="Privacy">…</boltArtifact>',
    );
  });
});
