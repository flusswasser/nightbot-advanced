# Design Guidelines Not Applicable

This project is a **backend API service** with no user interface requirements. The Node.js application serves as a Nightbot command endpoint that:

- Accepts HTTP requests from Nightbot
- Tracks usage counts in memory
- Returns JSON/text responses

**No visual design or frontend is required** for this implementation.

---

## Optional: If Adding a Monitoring Dashboard

If you decide to add a simple admin/monitoring interface in the future, here are minimal guidelines:

**Design Approach:** Utility-focused design system (Material Design or similar)

**Layout:**
- Single-page dashboard
- Central data table showing programs and their uninstall request counts
- Real-time updates via polling or websockets
- Tailwind spacing: 4, 6, 8 units for consistency

**Typography:**
- System font stack (SF Pro, Segoe UI, Roboto)
- Clear hierarchy: Large counts, smaller labels
- Monospace font for API endpoint display

**Components:**
- Data table with sortable columns (Program Name | Request Count | Last Requested)
- Search/filter bar
- API endpoint display with copy button
- Simple header with title "Nightbot Uninstall Tracker"

**No images required** for this utility interface.

Current project scope requires **API implementation only** - proceed directly to development without visual design work.