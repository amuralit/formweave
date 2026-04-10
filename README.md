# FormWeave

**The form renderer for MCP tools, A2A agents, and human-in-the-loop AI.**

One component. Any JSON Schema. Beautiful forms. Under 1ms.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Bundle Size](https://img.shields.io/badge/gzip-28KB-brightgreen)]()

![FormWeave](assets/formweave-preview.png)

Every AI agent that calls tools needs a human to review, edit, or approve parameters before execution. MCP has 100M+ monthly SDK downloads. A2A introduces agent-to-agent handoffs. CopilotKit's `renderAndWait` requires custom UI per tool. FormWeave eliminates all of that -- pass any `inputSchema` and get a production-quality form with zero configuration.

```tsx
<Form schema={tool.inputSchema} onSubmit={(data) => execute(data)} />
```

## Install

```bash
npm install formweave
```

```tsx
import { Form } from 'formweave';
import 'formweave/styles.css';

<Form
  schema={{
    type: 'object',
    properties: {
      name: { type: 'string' },
      email: { type: 'string', format: 'email' },
      role: { type: 'string', enum: ['admin', 'editor', 'viewer'] },
    },
  }}
  onSubmit={(data) => console.log(data)}
/>
```

`role` renders as pill buttons. `email` gets format validation. No configuration needed.

## Why FormWeave

- **Built for MCP/A2A** -- tool approval, agent pre-fill, cross-server field enhancement
- **50+ design rules** -- email arrays become people pickers, booleans become toggles, date pairs become visual blocks, enums become pills
- **Design system chameleon** -- auto-detects shadcn, MUI, Tailwind, Chakra, Ant from CSS variables
- **Progressive disclosure** -- optional fields hide behind expandable sections
- **Multi-step wizard** -- schemas with 15+ fields auto-split into pages
- **Agent-aware** -- tracks which values came from AI vs human, with visual indicators
- **28KB gzip** -- sub-1ms schema analysis, WCAG 2.2 AA, React 18/19

## MCP Tool Approval

The primary use case. An agent proposes tool arguments, the user reviews and approves.

```tsx
<Form
  schema={tool.inputSchema}
  values={tool.args}
  mode="approval"
  server={{ name: tool.serverName }}
  onSubmit={(data) => mcpClient.approveTool(tool.id, data)}
  onCancel={() => mcpClient.rejectTool(tool.id)}
/>
```

`mode="approval"` switches buttons to Approve/Deny. The `server` prop resolves brand icons for 40+ services (Google Calendar, Slack, GitHub, Jira, Salesforce, Stripe, etc.) automatically.

## CopilotKit / AG-UI

Drop-in adapter for CopilotKit's human-in-the-loop flow.

```tsx
import { AgentForm } from '@formweave/ag-ui';

useCopilotAction({
  name: "create_event",
  render: ({ args, status, handler }) => (
    <AgentForm
      schema={tool.inputSchema}
      values={args}
      status={status}
      onApprove={(data) => handler.approve(data)}
      onReject={() => handler.reject()}
    />
  ),
});
```

`AgentForm` maps lifecycle states (`awaiting` / `executing` / `complete` / `error`) to spinners, checkmarks, and retry buttons automatically.

## A2A Agent Handoffs

When Agent A sends structured data to Agent B and needs human confirmation at the boundary.

```tsx
<Form
  schema={handoff.parameterSchema}
  values={handoff.proposedArgs}
  mode="approval"
  server={{ name: handoff.sourceAgent }}
  onSubmit={(data) => a2aClient.confirm(handoff.id, data)}
  onCancel={() => a2aClient.reject(handoff.id)}
/>
```

## Cross-Server Tool Intelligence

Pass all MCP tools from all connected servers. FormWeave auto-discovers enhancement opportunities.

```tsx
<Form
  schema={tool.inputSchema}
  tools={mcpClient.listTools()}
  onToolCall={(name, args) => mcpClient.callTool(name, args)}
  onSubmit={(data) => mcpClient.executeTool(tool.name, data)}
/>
```

`attendees` field becomes a people picker backed by Google Contacts + Slack users. `channel` becomes a dropdown from Slack's `list_channels`. `location` gets Places autocomplete. All automatic.

## More Patterns

```tsx
// Batch approval -- agent proposes 3 actions at once
{pendingTools.map((tool, i) => (
  <Form
    key={tool.id}
    schema={tool.inputSchema}
    values={tool.args}
    display="accordion"
    accordionTitle={`${tool.serverName}: ${tool.name}`}
    accordionDefaultOpen={i === 0}
    mode="approval"
    onSubmit={(data) => approve(tool.id, data)}
  />
))}

// Chat inline -- form sits flush inside a message bubble
<Form schema={agentRequest} display="inline" onSubmit={resumeAgent} />

// IDE sidebar -- compact density for narrow panels
<Form schema={tool.inputSchema} display="panel" density="compact" />

// Multi-step wizard -- auto-activates for large schemas
<Form schema={salesforceSchema} display="wizard" />
```

## API Reference

| Prop | Type | Default | Description |
|---|---|---|---|
| `schema` | `JSONSchema7` | required | JSON Schema describing the form |
| `values` | `Record<string, any>` | `{}` | Pre-filled values (agent-proposed args) |
| `onSubmit` | `(data) => void` | -- | Called with validated data on submit |
| `onChange` | `(data, field) => void` | -- | Called on every field change |
| `onCancel` | `() => void` | -- | Shows cancel/deny button |
| `mode` | `'edit' \| 'approval' \| 'readonly'` | `'edit'` | Form interaction mode |
| `display` | `'card' \| 'inline' \| 'accordion' \| 'panel' \| 'wizard'` | `'card'` | Visual layout |
| `theme` | `string \| ThemeConfig` | `'auto'` | `'auto'`, `'shadcn'`, `'material'`, or custom |
| `density` | `'compact' \| 'comfortable'` | `'comfortable'` | Spacing density |
| `server` | `{ name, icon?, color? }` | -- | Service branding (40+ auto-resolved) |
| `tools` | `MCPTool[]` | -- | MCP tools for field enhancement |
| `onToolCall` | `(name, args) => Promise` | -- | Handler for tool-enhanced fetches |
| `heading` | `string` | -- | Custom form heading |
| `submitLabel` | `string` | -- | Custom submit button text |
| `style` | `CSSProperties` | -- | Inline styles (e.g. `maxWidth`) |

## Packages

| Package | Description | Size |
|---|---|---|
| `formweave` | Main entry | ~28 KB gzip total |
| `@formweave/core` | Schema engine, widget resolver, tool matcher | 7.5 KB |
| `@formweave/react` | Form component, Zustand state, validation | 7.7 KB |
| `@formweave/widgets` | 21 accessible widget components | 11.6 KB |
| `@formweave/theme` | CSS, design tokens, auto-detection | 2.2 KB |
| `@formweave/ag-ui` | CopilotKit / AG-UI adapter | 1 KB |

## Performance

| Schema | Fields | Analysis Time |
|---|---|---|
| Simple (Google Calendar) | 5 | 0.003ms |
| Medium (Slack) | 15 | 0.011ms |
| Large (Salesforce) | 30 | 0.020ms |
| Stress test | 100 | 0.129ms |

Analysis runs once per schema, not per render. Per-field Zustand subscriptions mean only the changed field re-renders. RJSF re-processes the full schema on every keystroke.

## Contributing

```bash
git clone https://github.com/amuralit/formweave.git && cd formweave
pnpm install && pnpm turbo build && pnpm turbo test
```

149 tests. Monorepo with Turborepo + pnpm. TypeScript strict mode. Zero type errors.

## License

MIT
