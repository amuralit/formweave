import { Form } from 'formweave';

// ─── Simple Google Calendar schema ───
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
  },
};

export function App() {
  return (
    <div style={{ maxWidth: 400, margin: '40px auto', padding: '0 20px' }}>
      <Form
        schema={calendarSchema}
        values={{
          summary: 'Design Review',
          start_time: '2026-04-10T14:00:00',
          end_time: '2026-04-10T15:00:00',
          recurrence: 'none',
        }}
        server={{ name: 'Google Calendar' }}
        heading="Create event"
        onSubmit={(data) => console.log('Submitted:', data)}
        onCancel={() => console.log('Cancelled')}
        submitLabel="Create event"
      />
    </div>
  );
}
