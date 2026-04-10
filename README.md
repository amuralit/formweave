# FormWeave

One component. Any JSON Schema. Beautiful forms. Under 1ms.

![FormWeave](assets/formweave-preview.png)

## Install

```bash
npm install formweave
```

```tsx
import { Form } from 'formweave';
import 'formweave/styles.css';

<Form
  schema={{ type: 'object', properties: {
    name: { type: 'string' },
    email: { type: 'string', format: 'email' },
    role: { type: 'string', enum: ['admin', 'editor', 'viewer'] },
  }}}
  onSubmit={(data) => console.log(data)}
/>
```

That renders a polished, accessible form. `role` becomes pill buttons. No configuration.

## What It Does

- Renders any JSON Schema as a production-quality form
- Auto-detects your design system (shadcn, MUI, Tailwind, Chakra, Ant)
- Smart widgets: email arrays become people pickers, booleans become toggles, enums become pills
- Progressive disclosure -- optional fields hide behind "N more fields"
- Tool-aware: pass MCP tools and fields auto-upgrade with search/autocomplete
- Agent pre-fill with visual AI indicators
- 28KB gzip, sub-1ms analysis, WCAG 2.2 AA
- React 18 and 19

## For MCP / AI Agents

FormWeave is built for human-in-the-loop AI. Five patterns cover most use cases.

### 1. MCP Tool Approval

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

`mode="approval"` switches the button to "Approve", adds "Deny", and marks agent-prefilled values. The `server` prop resolves brand icons for 40+ services automatically.

### 2. CopilotKit / AG-UI

```tsx
import { AgentForm } from '@formweave/ag-ui';
import { useCopilotAction } from '@copilotkit/react-core';

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

`AgentForm` maps CopilotKit lifecycle states (`awaiting`, `executing`, `complete`, `error`) to the right UI automatically -- spinners, checkmarks, retry buttons.

### 3. Batch Approval

```tsx
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
    onCancel={() => reject(tool.id)}
  />
))}
```

### 4. Chat Inline

```tsx
<Form
  schema={agentRequest}
  display="inline"
  onSubmit={(data) => resumeAgent(data)}
/>
```

`display="inline"` strips the card chrome so the form sits flush inside a chat bubble.

### 5. Cross-Server Intelligence

```tsx
<Form
  schema={tool.inputSchema}
  tools={mcpClient.listTools()}
  onToolCall={(name, args) => mcpClient.callTool(name, args)}
  onSubmit={(data) => mcpClient.executeTool(tool.name, data)}
/>
```

Pass all connected MCP tools. FormWeave's matching engine (exact, schema-based, Jaro-Winkler fuzzy) auto-upgrades fields: `attendees` becomes a people picker backed by Google Contacts, `channel` becomes a dropdown from Slack's `list_channels`.

## API Reference

The top 15 props. Full reference in the source types.

| Prop | Type | Default | Description |
|---|---|---|---|
| `schema` | `JSONSchema7` | required | JSON Schema describing the form |
| `values` | `Record<string, any>` | `{}` | Pre-filled values (e.g. agent-proposed args) |
| `onSubmit` | `(data) => void` | -- | Called with validated data on submit |
| `onChange` | `(data, field) => void` | -- | Called on every field change |
| `onCancel` | `() => void` | -- | Cancel handler; shows a cancel/deny button |
| `mode` | `'edit' \| 'approval' \| 'readonly'` | `'edit'` | Form interaction mode |
| `display` | `'card' \| 'inline' \| 'accordion' \| 'panel' \| 'wizard'` | `'card'` | Visual layout mode |
| `theme` | `string \| ThemeConfig` | `'auto'` | `'auto'`, `'shadcn'`, `'material'`, or custom object |
| `density` | `'compact' \| 'comfortable'` | `'comfortable'` | Spacing density |
| `server` | `{ name, icon?, color? }` | -- | Server branding (auto-resolves 40+ services) |
| `tools` | `MCPTool[]` | -- | MCP tools for cross-server field enhancement |
| `onToolCall` | `(name, args) => Promise` | -- | Handler for tool-enhanced field fetches |
| `heading` | `string` | schema title | Custom form heading |
| `wizardThreshold` | `number` | `15` | Field count that triggers wizard mode |
| `showDiff` | `boolean` | `false` | Highlight diffs between defaults and values |

## Packages

| Package | What | Size |
|---|---|---|
| `formweave` | Main entry -- re-exports everything | ~28 KB gzip |
| `@formweave/core` | Schema engine, widget resolver, tool matcher (zero deps) | ~7.5 KB |
| `@formweave/react` | React Form component + Zustand store | ~7.7 KB |
| `@formweave/widgets` | 21 accessible widget components | ~11.6 KB |
| `@formweave/theme` | CSS, design tokens, auto-detection | ~2.2 KB |
| `@formweave/ag-ui` | CopilotKit / AG-UI adapter | ~1 KB |

## Performance

| Schema | Fields | Total Analysis |
|---|---|---|
| Google Calendar `create_event` | 5 | < 0.5ms |
| Slack `send_message` | 15 | < 1ms |
| Salesforce `create_opportunity` | 30 | < 1ms |
| Stress test | 100 | < 10ms |

Analysis runs once per schema, not per render. Only the changed field re-renders (Zustand per-field subscriptions). Alternatives re-process the full schema on every keystroke.

## Contributing

```bash
git clone https://github.com/amuralit/formweave.git && cd formweave
pnpm install && pnpm turbo build && pnpm turbo test
```

149 tests covering schema analysis, widget resolution, tool matching, grouping, conditionals, and wizard computation.

## License

MIT
