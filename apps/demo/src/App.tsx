import { Form } from 'formweave';
import { AgentForm } from '@formweave/ag-ui';

// ─── 1. Google Calendar — Create Event ───
const calendarSchema = {
  type: 'object' as const,
  required: ['summary', 'start_time'],
  properties: {
    summary: { type: 'string', description: 'Event title' },
    start_time: { type: 'string', format: 'date-time' },
    end_time: { type: 'string', format: 'date-time' },
    attendees: { type: 'array', items: { type: 'string', format: 'email' } },
    location: { type: 'string' },
    all_day: { type: 'boolean' },
    recurrence: { type: 'string', enum: ['none', 'daily', 'weekly', 'monthly'] },
    description: { type: 'string' },
  },
};

// ─── 2. Slack — Send Message ───
const slackSchema = {
  type: 'object' as const,
  required: ['channel', 'text'],
  properties: {
    channel: { type: 'string', description: 'Slack channel' },
    text: { type: 'string', description: 'Message body' },
    unfurl_links: { type: 'boolean' },
    unfurl_media: { type: 'boolean' },
  },
};

// ─── 3. Jira — Create Issue (AG-UI) ───
const jiraSchema = {
  type: 'object' as const,
  required: ['summary', 'project', 'issue_type'],
  properties: {
    summary: { type: 'string' },
    project: { type: 'string' },
    issue_type: { type: 'string', enum: ['Bug', 'Task', 'Story', 'Epic'] },
    priority: { type: 'string', enum: ['High', 'Medium', 'Low'] },
    description: { type: 'string' },
    assignee: { type: 'string', format: 'email' },
    labels: { type: 'array', items: { type: 'string' } },
    story_points: { type: 'integer', minimum: 1, maximum: 21 },
  },
};

// ─── 4. Salesforce — Create Opportunity (Wizard) ───
const salesforceSchema = {
  type: 'object' as const,
  required: ['name', 'stage', 'close_date', 'amount'],
  properties: {
    name: { type: 'string' },
    account_name: { type: 'string' },
    stage: { type: 'string', enum: ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'] },
    amount: { type: 'number' },
    close_date: { type: 'string', format: 'date' },
    probability: { type: 'integer', minimum: 0, maximum: 100 },
    type: { type: 'string', enum: ['New Business', 'Existing Business'] },
    lead_source: { type: 'string', enum: ['Web', 'Phone', 'Partner', 'Email', 'Event'] },
    next_step: { type: 'string' },
    description: { type: 'string' },
    contact_name: { type: 'string' },
    contact_email: { type: 'string', format: 'email' },
    contact_phone: { type: 'string' },
    billing_street: { type: 'string' },
    billing_city: { type: 'string' },
    billing_state: { type: 'string' },
    billing_zip: { type: 'string' },
    billing_country: { type: 'string' },
    shipping_street: { type: 'string' },
    shipping_city: { type: 'string' },
    shipping_state: { type: 'string' },
    shipping_zip: { type: 'string' },
    forecast_category: { type: 'string', enum: ['Pipeline', 'Best Case', 'Commit', 'Closed'] },
  },
};

// ─── 5. GitHub — Create Issue ───
const githubSchema = {
  type: 'object' as const,
  required: ['title'],
  properties: {
    title: { type: 'string', description: 'Issue title' },
    body: { type: 'string', description: 'Issue description' },
    assignees: { type: 'array', items: { type: 'string', format: 'email' } },
    labels: { type: 'array', items: { type: 'string' } },
    milestone: { type: 'string' },
  },
};

// ─── 6. Stripe — Create Payment Link ───
const stripeSchema = {
  type: 'object' as const,
  required: ['amount', 'currency'],
  properties: {
    amount: { type: 'number' },
    currency: { type: 'string', enum: ['usd', 'eur', 'gbp'] },
    description: { type: 'string' },
    customer_email: { type: 'string', format: 'email' },
    allow_promotion_codes: { type: 'boolean' },
  },
};

// ─── 7. Smart Address — Tool-Aware Enhancement ───
const shippingSchema = {
  type: 'object' as const,
  required: ['name', 'street', 'city', 'state', 'zip', 'country'],
  properties: {
    name: { type: 'string', description: 'Full name' },
    email: { type: 'string', format: 'email' },
    phone: { type: 'string' },
    street: { type: 'string', description: 'Street address' },
    apartment: { type: 'string', description: 'Apt, suite, unit' },
    city: { type: 'string' },
    state: { type: 'string' },
    zip: { type: 'string', pattern: '^[0-9]{5}(-[0-9]{4})?$' },
    country: { type: 'string', enum: ['US', 'CA', 'UK', 'AU', 'DE', 'FR', 'JP', 'IN'] },
    delivery_instructions: { type: 'string' },
    is_default: { type: 'boolean' },
  },
};

// Simulated MCP tools for address enhancement
const addressTools = [
  {
    name: 'places_autocomplete',
    description: 'Search for addresses and places',
    inputSchema: { type: 'object' as const, properties: { query: { type: 'string' } } },
  },
  {
    name: 'contacts_search',
    description: 'Search contacts by name or email',
    inputSchema: { type: 'object' as const, properties: { query: { type: 'string' } } },
  },
];

// Simulated address database with structured data
const ADDRESS_DB = [
  { street: '1600 Amphitheatre Pkwy', city: 'Mountain View', state: 'CA', zip: '94043' },
  { street: '1 Apple Park Way', city: 'Cupertino', state: 'CA', zip: '95014' },
  { street: '350 5th Ave', city: 'New York', state: 'NY', zip: '10118' },
  { street: '1 Hacker Way', city: 'Menlo Park', state: 'CA', zip: '94025' },
  { street: '410 Terry Ave N', city: 'Seattle', state: 'WA', zip: '98109' },
  { street: '1455 Market St', city: 'San Francisco', state: 'CA', zip: '94103' },
  { street: '1478 Vancouver Green', city: 'San Jose', state: 'CA', zip: '95134' },
  { street: '233 S Wacker Dr', city: 'Chicago', state: 'IL', zip: '60606' },
  { street: '1 Infinite Loop', city: 'Cupertino', state: 'CA', zip: '95014' },
  { street: '1601 Willow Rd', city: 'Menlo Park', state: 'CA', zip: '94025' },
];

// Simulated tool call handler
async function handleToolCall(toolName: string, args: Record<string, any>) {
  await new Promise(r => setTimeout(r, 150));
  const query = (args.query || '').toLowerCase();

  if (toolName === 'places_autocomplete') {
    return ADDRESS_DB
      .filter(a => `${a.street} ${a.city} ${a.state} ${a.zip}`.toLowerCase().includes(query))
      .slice(0, 5)
      .map(a => ({
        id: a.zip,
        name: `${a.street}, ${a.city}, ${a.state} ${a.zip}`,
        // Structured data for auto-populating sibling fields
        _fields: { street: a.street, city: a.city, state: a.state, zip: a.zip, country: 'US' },
      }));
  }
  if (toolName === 'contacts_search') {
    const contacts = [
      { id: 'arun@example.com', name: 'Arun Bhaskar' },
      { id: 'sarah@example.com', name: 'Sarah Chen' },
      { id: 'mike@example.com', name: 'Mike Johnson' },
      { id: 'lisa@example.com', name: 'Lisa Wang' },
    ];
    return contacts.filter(c => c.name.toLowerCase().includes(query) || c.id.includes(query));
  }
  return [];
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="demo-section">
      <span className="demo-label">{label}</span>
      {children}
    </div>
  );
}

export function App() {
  return (
    <div className="demo-grid">
      {/* 1. Google Calendar — Full featured with pre-fill */}
      <Section label="Google Calendar — Tool Approval">
        <Form
          schema={calendarSchema}
          values={{
            summary: 'Design Review',
            start_time: '2026-04-10T14:00:00',
            end_time: '2026-04-10T15:00:00',
            attendees: ['arun@example.com', 'sarah@example.com'],
            recurrence: 'none',
          }}
          server={{ name: 'Google Calendar' }}
          heading="Create event"
          submitLabel="Create event"
          onSubmit={(data) => console.log('Calendar:', data)}
          onCancel={() => console.log('Cancelled')}
        />
      </Section>

      {/* 2. Slack — Inline chat form */}
      <Section label="Slack — Inline Chat Form">
        <Form
          schema={slackSchema}
          values={{ channel: '#engineering', text: 'Deployment complete for v2.4.1' }}
          server={{ name: 'Slack' }}
          heading="Send message"
          display="inline"
          submitLabel="Send"
          onSubmit={(data) => console.log('Slack:', data)}
        />
      </Section>

      {/* 3. Jira — AG-UI Agent Approval */}
      <Section label="Jira — AG-UI Agent Approval">
        <AgentForm
          schema={jiraSchema}
          values={{
            summary: 'Fix login timeout on mobile Safari',
            project: 'FRONTEND',
            issue_type: 'Bug',
            priority: 'High',
            description: 'Users on iOS 17 report session timeouts after 30s.',
            labels: ['mobile', 'auth'],
            story_points: 5,
          }}
          server={{ name: 'Jira' }}
          heading="Create issue"
          status="awaiting"
          onApprove={(data) => console.log('Approved:', data)}
          onReject={() => console.log('Rejected')}
        />
      </Section>

      {/* 4. GitHub — Simple form */}
      <Section label="GitHub — Create Issue">
        <Form
          schema={githubSchema}
          values={{ title: 'Add dark mode support' }}
          server={{ name: 'GitHub' }}
          heading="New issue"
          submitLabel="Create issue"
          onSubmit={(data) => console.log('GitHub:', data)}
          onCancel={() => console.log('Cancelled')}
        />
      </Section>

      {/* 5. Stripe — Compact panel */}
      <Section label="Stripe — Payment Link (Panel)">
        <Form
          schema={stripeSchema}
          values={{ currency: 'usd', amount: 49.99 }}
          server={{ name: 'Stripe' }}
          heading="Create payment link"
          display="panel"
          density="compact"
          submitLabel="Create link"
          onSubmit={(data) => console.log('Stripe:', data)}
        />
      </Section>

      {/* 6. Smart Address — Tool-Aware Enhancement */}
      <Section label="Shipping — Smart Address with Tool Enhancement">
        <Form
          schema={shippingSchema}
          values={{
            name: 'Arun Bhaskar',
            email: 'arun@example.com',
            country: 'US',
          }}
          server={{ name: 'Stripe' }}
          heading="Shipping address"
          submitLabel="Save address"
          tools={addressTools}
          onToolCall={handleToolCall}
          onSubmit={(data) => console.log('Address:', data)}
          onCancel={() => console.log('Cancelled')}
        />
      </Section>

      {/* 7. Batch Approval — 3 tools stacked as accordions */}
      <Section label="Batch Approval — 3 Agent Actions">
        {[
          {
            id: '1',
            serverName: 'Google Calendar',
            name: 'create_event',
            inputSchema: {
              type: 'object' as const,
              required: ['summary'],
              properties: {
                summary: { type: 'string' },
                start_time: { type: 'string', format: 'date-time' },
                attendees: { type: 'array', items: { type: 'string', format: 'email' } },
              },
            },
            args: { summary: 'Sprint Planning', start_time: '2026-04-11T10:00:00' },
          },
          {
            id: '2',
            serverName: 'Slack',
            name: 'send_message',
            inputSchema: {
              type: 'object' as const,
              required: ['channel', 'text'],
              properties: {
                channel: { type: 'string' },
                text: { type: 'string' },
              },
            },
            args: { channel: '#engineering', text: 'Sprint planning in 30 min' },
          },
          {
            id: '3',
            serverName: 'Jira',
            name: 'create_issue',
            inputSchema: {
              type: 'object' as const,
              required: ['summary'],
              properties: {
                summary: { type: 'string' },
                issue_type: { type: 'string', enum: ['Bug', 'Task', 'Story'] },
                priority: { type: 'string', enum: ['High', 'Medium', 'Low'] },
              },
            },
            args: { summary: 'Update CI pipeline config', issue_type: 'Task', priority: 'Medium' },
          },
        ].map((tool, i) => (
          <Form
            key={tool.id}
            schema={tool.inputSchema}
            values={tool.args}
            display="accordion"
            accordionTitle={`${tool.serverName}: ${tool.name}`}
            accordionDefaultOpen={i === 0}
            mode="approval"
            server={{ name: tool.serverName }}
            onSubmit={(data) => console.log('Approved:', tool.id, data)}
            onCancel={() => console.log('Rejected:', tool.id)}
          />
        ))}
      </Section>

      {/* 7. Salesforce — Wizard */}
      <Section label="Salesforce — Multi-Step Wizard">
        <Form
          schema={salesforceSchema}
          values={{ name: 'Acme Corp — Enterprise Plan', stage: 'Proposal', amount: 48000 }}
          server={{ name: 'Salesforce' }}
          heading="Create opportunity"
          display="wizard"
          onSubmit={(data) => console.log('Salesforce:', data)}
        />
      </Section>
    </div>
  );
}
