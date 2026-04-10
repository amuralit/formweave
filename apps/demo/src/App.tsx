import { Form } from 'formweave';
import { AgentForm } from '@formweave/ag-ui';

// ─── Schema 1: Google Calendar Create Event ───
const calendarSchema = {
  type: 'object' as const,
  required: ['summary', 'start_time'],
  properties: {
    summary: { type: 'string', description: 'Event title' },
    start_time: { type: 'string', format: 'date-time' },
    end_time: { type: 'string', format: 'date-time' },
    attendees: {
      type: 'array',
      items: { type: 'string', format: 'email' },
    },
    location: { type: 'string' },
    all_day: { type: 'boolean' },
    recurrence: {
      type: 'string',
      enum: ['none', 'daily', 'weekly', 'monthly'],
    },
    description: { type: 'string' },
    visibility: {
      type: 'string',
      enum: ['default', 'private', 'public'],
    },
  },
};

// ─── Schema 2: Slack Send Message ───
const slackSchema = {
  type: 'object' as const,
  required: ['channel', 'text'],
  properties: {
    channel: { type: 'string', description: 'Slack channel' },
    text: { type: 'string', description: 'Message body' },
    thread_ts: { type: 'string', description: 'Thread timestamp for replies' },
    unfurl_links: { type: 'boolean' },
    unfurl_media: { type: 'boolean' },
  },
};

// ─── Schema 3: Salesforce Create Opportunity (Wizard) ───
const salesforceSchema = {
  type: 'object' as const,
  required: ['name', 'stage', 'close_date', 'amount'],
  properties: {
    name: { type: 'string' },
    account_name: { type: 'string' },
    stage: {
      type: 'string',
      enum: [
        'Prospecting',
        'Qualification',
        'Proposal',
        'Negotiation',
        'Closed Won',
        'Closed Lost',
      ],
    },
    amount: { type: 'number' },
    close_date: { type: 'string', format: 'date' },
    probability: { type: 'integer', minimum: 0, maximum: 100 },
    type: {
      type: 'string',
      enum: ['New Business', 'Existing Business'],
    },
    lead_source: {
      type: 'string',
      enum: ['Web', 'Phone', 'Partner', 'Email', 'Event'],
    },
    next_step: { type: 'string' },
    description: { type: 'string' },
    contact_name: { type: 'string' },
    contact_email: { type: 'string', format: 'email' },
    contact_phone: { type: 'string' },
    contact_title: { type: 'string' },
    billing_street: { type: 'string' },
    billing_city: { type: 'string' },
    billing_state: { type: 'string' },
    billing_zip: { type: 'string' },
    billing_country: { type: 'string' },
    shipping_street: { type: 'string' },
    shipping_city: { type: 'string' },
    shipping_state: { type: 'string' },
    shipping_zip: { type: 'string' },
    shipping_country: { type: 'string' },
    forecast_category: {
      type: 'string',
      enum: ['Pipeline', 'Best Case', 'Commit', 'Closed'],
    },
    campaign_source: { type: 'string' },
  },
};

// ─── Schema 4: Jira Create Issue ───
const jiraSchema = {
  type: 'object' as const,
  required: ['summary', 'project', 'issue_type'],
  properties: {
    summary: { type: 'string' },
    project: { type: 'string' },
    issue_type: {
      type: 'string',
      enum: ['Bug', 'Task', 'Story', 'Epic'],
    },
    priority: {
      type: 'string',
      enum: ['Highest', 'High', 'Medium', 'Low', 'Lowest'],
    },
    description: { type: 'string' },
    assignee: { type: 'string', format: 'email' },
    labels: {
      type: 'array',
      items: { type: 'string' },
    },
    story_points: { type: 'integer', minimum: 1, maximum: 21 },
  },
};

// ─── Schema 5: Conditional Fields ───
const conditionalSchema = {
  type: 'object' as const,
  required: ['event_type'],
  properties: {
    event_type: {
      type: 'string',
      enum: ['meeting', 'focus_time', 'out_of_office'],
    },
    all_day: { type: 'boolean' },
    start_time: { type: 'string', format: 'date-time' },
    end_time: { type: 'string', format: 'date-time' },
    focus_topic: { type: 'string', description: 'What you want to focus on' },
    ooo_message: {
      type: 'string',
      description: 'Auto-reply message for out of office',
    },
  },
  if: { properties: { event_type: { const: 'focus_time' } } },
  then: { required: ['focus_topic'] },
  allOf: [
    {
      if: { properties: { event_type: { const: 'out_of_office' } } },
      then: { required: ['ooo_message'] },
    },
  ],
};

export function App() {
  return (
    <div className="demo-grid">
      {/* 1. Google Calendar — Full featured */}
      <div className="demo-section">
        <span className="demo-label">Google Calendar — Tool Approval</span>
        <Form
          schema={calendarSchema}
          values={{
            summary: 'Design Review',
            start_time: '2026-04-10T14:00',
            end_time: '2026-04-10T15:00',
            attendees: ['arun@example.com', 'sarah@example.com'],
            recurrence: 'none',
          }}
          server={{ name: 'Google Calendar' }}
          mode="approval"
          onSubmit={(data) => console.log('Approved:', data)}
          onCancel={() => console.log('Denied')}
        />
      </div>

      {/* 2. Slack — Inline chat form */}
      <div className="demo-section">
        <span className="demo-label">Slack — Inline Chat Form</span>
        <Form
          schema={slackSchema}
          values={{ channel: '#engineering', text: 'Deployment complete for v2.4.1' }}
          server={{ name: 'Slack' }}
          display="inline"
          onSubmit={(data) => console.log('Sent:', data)}
        />
      </div>

      {/* 3. Jira — AG-UI Agent Approval */}
      <div className="demo-section">
        <span className="demo-label">Jira — AG-UI Agent Approval (CopilotKit)</span>
        <AgentForm
          schema={jiraSchema}
          values={{
            summary: 'Fix login timeout on mobile Safari',
            project: 'FRONTEND',
            issue_type: 'Bug',
            priority: 'High',
            description: 'Users on iOS 17 Safari report session timeouts after 30 seconds of inactivity.',
            labels: ['mobile', 'auth', 'safari'],
            story_points: 5,
          }}
          server={{ name: 'Jira' }}
          status="awaiting"
          onApprove={(data) => console.log('Approved:', data)}
          onReject={() => console.log('Rejected')}
        />
      </div>

      {/* 4. Salesforce — Wizard */}
      <div className="demo-section">
        <span className="demo-label">Salesforce — Multi-Step Wizard (25+ Fields)</span>
        <Form
          schema={salesforceSchema}
          values={{ name: 'Acme Corp — Enterprise Plan', stage: 'Proposal', amount: 48000 }}
          server={{ name: 'Salesforce' }}
          display="wizard"
          onSubmit={(data) => console.log('Created:', data)}
        />
      </div>

      {/* 5. Conditional Fields */}
      <div className="demo-section">
        <span className="demo-label">Conditional Visibility — if/then/else</span>
        <Form
          schema={conditionalSchema}
          values={{ event_type: 'meeting' }}
          server={{ name: 'Google Calendar' }}
          onSubmit={(data) => console.log('Submitted:', data)}
        />
      </div>

      {/* 6. Panel mode — Narrow sidebar */}
      <div className="demo-section" style={{ maxWidth: 320 }}>
        <span className="demo-label">Panel Mode — IDE Sidebar</span>
        <Form
          schema={jiraSchema}
          display="panel"
          density="compact"
          server={{ name: 'Linear' }}
          onSubmit={(data) => console.log('Created:', data)}
        />
      </div>
    </div>
  );
}
