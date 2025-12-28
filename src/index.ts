import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { html } from 'hono/html';

const app = new Hono();

const API_URL = process.env.API_URL || 'https://api-production-7a33.up.railway.app';

interface Event {
  id: string;
  name: string;
  description: string | null;
  venueName: string | null;
  address: string | null;
  city: string;
  state: string;
  zipCode: string | null;
  latitude: string | null;
  longitude: string | null;
  startDate: string;
  endDate: string;
  category: string | null;
  boothFee: number | null;
  expectedAttendance: number | null;
  vendorSpots: number | null;
  organizerName: string | null;
  website: string | null;
  applicationDeadline: string | null;
}

// Format currency
const formatFee = (cents: number | null) => cents ? `$${(cents / 100).toFixed(0)}` : 'Free';

// Format date
const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', {
  weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
});

// Category badge colors
const categoryColors: Record<string, string> = {
  farmers_market: '#22c55e',
  craft_fair: '#8b5cf6',
  festival: '#f59e0b',
  flea_market: '#6366f1',
};

// Events page HTML
const eventsPage = (eventList: Event[], location: { lat: number; lng: number; radius: number }) => html`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VendorWize - Events Near You</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a; color: #e2e8f0; line-height: 1.6;
    }
    .container { max-width: 900px; margin: 0 auto; padding: 20px; }
    header { text-align: center; padding: 40px 0; }
    h1 { font-size: 2.5rem; background: linear-gradient(135deg, #60a5fa, #a78bfa);
         -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .subtitle { color: #94a3b8; margin-top: 8px; }
    .filters { display: flex; gap: 12px; justify-content: center; margin: 20px 0; flex-wrap: wrap; }
    .filter-btn { padding: 8px 16px; border-radius: 20px; border: 1px solid #334155;
                  background: transparent; color: #94a3b8; cursor: pointer; transition: all 0.2s; }
    .filter-btn:hover, .filter-btn.active { background: #1e293b; border-color: #60a5fa; color: #fff; }
    .events { display: grid; gap: 16px; }
    .event-card { background: #1e293b; border-radius: 12px; padding: 20px;
                  border: 1px solid #334155; transition: transform 0.2s, border-color 0.2s; }
    .event-card:hover { transform: translateY(-2px); border-color: #60a5fa; }
    .event-header { display: flex; justify-content: space-between; align-items: start; gap: 12px; }
    .event-name { font-size: 1.25rem; font-weight: 600; color: #f1f5f9; }
    .event-badge { padding: 4px 10px; border-radius: 12px; font-size: 0.75rem;
                   font-weight: 500; text-transform: uppercase; }
    .event-meta { display: flex; gap: 16px; margin: 12px 0; color: #94a3b8; font-size: 0.9rem; flex-wrap: wrap; }
    .event-meta span { display: flex; align-items: center; gap: 4px; }
    .event-desc { color: #cbd5e1; margin: 12px 0; }
    .event-footer { display: flex; justify-content: space-between; align-items: center;
                    margin-top: 16px; padding-top: 16px; border-top: 1px solid #334155; }
    .event-fee { font-size: 1.5rem; font-weight: 700; color: #22c55e; }
    .event-spots { color: #94a3b8; }
    .event-link { padding: 8px 16px; background: #3b82f6; color: white; border-radius: 8px;
                  text-decoration: none; font-weight: 500; }
    .event-link:hover { background: #2563eb; }
    .empty { text-align: center; padding: 60px; color: #64748b; }
    .error { text-align: center; padding: 40px; color: #f87171; background: #1e293b; border-radius: 12px; }
    @media (max-width: 640px) {
      .event-header { flex-direction: column; }
      .event-footer { flex-direction: column; gap: 12px; text-align: center; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>VendorWize</h1>
      <p class="subtitle">Find vendor events near Raleigh, NC (${location.radius} mile radius)</p>
    </header>

    <div class="filters">
      <button class="filter-btn active" data-filter="all">All Events</button>
      <button class="filter-btn" data-filter="farmers_market">Farmers Markets</button>
      <button class="filter-btn" data-filter="craft_fair">Craft Fairs</button>
      <button class="filter-btn" data-filter="festival">Festivals</button>
    </div>

    <div class="events">
      ${eventList.length === 0 ? html`
        <div class="empty">No events found in your area. Check back soon!</div>
      ` : eventList.map(event => html`
        <div class="event-card" data-category="${event.category}">
          <div class="event-header">
            <div class="event-name">${event.name}</div>
            <span class="event-badge" style="background: ${categoryColors[event.category || ''] || '#64748b'}">
              ${(event.category || 'event').replace('_', ' ')}
            </span>
          </div>
          <div class="event-meta">
            <span>📍 ${event.city}, ${event.state}</span>
            <span>📅 ${formatDate(event.startDate)}</span>
            <span>👥 ${event.expectedAttendance?.toLocaleString() || '?'} expected</span>
          </div>
          <p class="event-desc">${event.description}</p>
          <div class="event-footer">
            <div>
              <div class="event-fee">${formatFee(event.boothFee)}</div>
              <div class="event-spots">${event.vendorSpots || '?'} vendor spots</div>
            </div>
            ${event.website ? html`<a href="${event.website}" class="event-link" target="_blank">Learn More</a>` : ''}
          </div>
        </div>
      `)}
    </div>
  </div>

  <script>
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.filter;
        document.querySelectorAll('.event-card').forEach(card => {
          card.style.display = (filter === 'all' || card.dataset.category === filter) ? 'block' : 'none';
        });
      });
    });
  </script>
</body>
</html>
`;

const errorPage = (message: string) => html`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VendorWize - Error</title>
  <style>
    body { font-family: system-ui; background: #0f172a; color: #e2e8f0;
           display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .error { text-align: center; padding: 40px; }
    h1 { color: #f87171; }
  </style>
</head>
<body>
  <div class="error">
    <h1>Something went wrong</h1>
    <p>${message}</p>
  </div>
</body>
</html>
`;

// Home page - Events near me
app.get('/', async (c) => {
  const lat = parseFloat(c.req.query('lat') || '35.7796');
  const lng = parseFloat(c.req.query('lng') || '-78.6382');
  const radius = parseFloat(c.req.query('radius') || '50');

  try {
    const response = await fetch(`${API_URL}/api/events/near?lat=${lat}&lng=${lng}&radius=${radius}`);
    const data = await response.json() as { events: Event[] };
    return c.html(eventsPage(data.events, { lat, lng, radius }));
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return c.html(errorPage('Failed to load events. Please try again later.'));
  }
});

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'healthy' });
});

const port = parseInt(process.env.PORT || '3000');
console.log(`VendorWize Web starting on port ${port}`);
console.log(`API URL: ${API_URL}`);

serve({
  fetch: app.fetch,
  port,
});
