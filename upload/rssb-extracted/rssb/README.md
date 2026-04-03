# Radha Soami Satsang Beas - Schedule Manager (React Edition).

A modern React-based application for managing Satsang schedules, assigning Satsang Kartas and Pathis, and tracking detailed analytics.

## Features

- **Setup Tab**: Manage Satsang Ghars (places), Satsang Kartas (SKs), and Pathis
- **Schedule Tab**: Create schedule entries with automatic Pathi assignment (load-balanced)
- **Dashboard Tab**: Comprehensive analytics with separate metrics for each Pathi slot (A, B, C, D)
- **Baal Satsang Support**: Optional Baal Satsang toggle for places (adds Pathi-D slot)
- **Data Persistence**: Master lists saved to localStorage
- **Export**: Download schedule as CSV
- **Print**: Print-friendly schedule layout
- **Feedback**: Built-in feedback modal for user suggestions/bugs
- **Toast Notifications**: Bottom-right positioned notifications for user feedback

## Installation

```bash
# Install dependencies
npm install

# Start the development server
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

## Build for Production

```bash
npm run build
```

This creates an optimized production build in the `build/` directory.

## Project Structure

```
src/
├── components/
│   ├── Header.jsx           # App header with logo and navigation
│   ├── Tabs.jsx             # Tab navigation
│   ├── SetupTab.jsx         # Configuration tab (places, SKs, Pathis)
│   ├── ScheduleTab.jsx      # Schedule creation tab with auto-assignment
│   ├── ViewTab.jsx          # Dashboard with detailed analytics and metrics
│   ├── FeedbackModal.jsx    # Feedback form modal
│   ├── ReleaseNotesModal.jsx # Release notes
│   ├── Toast.jsx            # Bottom-right positioned notification system
│   └── FeedbackModal.jsx    # User feedback collection
├── hooks/
│   └── useLocalStorage.js   # Custom hook for localStorage persistence
├── utils/
│   └── scheduleLogic.js     # Schedule and Pathi assignment logic
├── App.jsx                  # Main app component with state management
├── index.js                 # React entry point
└── index.css                # Global styles with glassmorphism effects

public/
└── index.html               # HTML template
```

## Key Features Explained

### Automatic Pathi Assignment
- Pathis are chosen randomly from available options for each date
- Load balancing ensures even distribution across all Pathis
- Prevents double-booking of Pathis on the same date
- Supports VCD (which has no Pathi-A) and regular SKs
- Baal Satsang places get 4 Pathi slots (A, B, C, D), others get 3 (A, B, C)

### Detailed Analytics Dashboard
- **Total Programs**: Overall count of scheduled programs
- **SK Distribution**: Individual assignment counts for each Satsang Karta
- **Pathi Metrics**: Separate tracking for each slot (A, B, C, D) with color-coded visualization
- **Vacant Dates**: Automatic calculation of unscheduled dates for each place
- **Load Balancing**: Visual indicators show distribution fairness

### Baal Satsang
- When enabled for a place, adds an additional 4th Pathi slot (Pathi-D)
- Pathi-D is only assigned for Baal Satsang places
- Regular places use only Pathi A, B, and C slots

### Toast Notifications
- User feedback appears in bottom-right corner
- Color-coded notifications (success, error, info)
- Auto-dismiss with smooth animations
- Positioned outside main container for visibility

### Data Persistence
- Configuration (places, SKs, Pathis) saved to browser's localStorage
- Schedule is session-only and clears on page refresh
- Can be exported as CSV for backup

## Technologies Used

- **React 18** - UI framework with hooks and functional components
- **CSS3** - Modern styling with CSS variables, glassmorphism effects, and animations
- **localStorage** - Client-side data persistence for configuration
- **Font Awesome 6** - Icon library for UI elements
- **Google Fonts (Poppins)** - Clean, modern typography
- **Toast Notifications** - Custom notification system with positioning

## Browser Support

Works on all modern browsers (Chrome, Firefox, Safari, Edge) with ES6 support.

## License

Created for Radha Soami Satsang Beas community scheduling.
