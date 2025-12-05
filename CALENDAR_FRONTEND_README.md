# Calendar Frontend Implementation

## ✅ What's Been Implemented

### 1. **Calendar Component** (`src/Dashboard/Calendar.jsx`)

A fully-featured calendar interface with:

- **FullCalendar Integration**: Interactive calendar with month, week, and day views
- **Event Management**: Create, view, edit, and delete events
- **Alert System**: Visual alerts for events happening tomorrow
- **Search Functionality**: Search events by title, description, or notes
- **Category System**: Color-coded categories (Work, Personal, Health, Finance, Social, General)
- **Notes Storage**: Store detailed notes with each event
- **Responsive Design**: Works on desktop, tablet, and mobile

### 2. **API Integration** (`Api/action.js`)

Added 11 calendar API functions:

- `createEventApi` - Create new event
- `getEventsApi` - Get all events with filters
- `getEventByIdApi` - Get specific event
- `updateEventApi` - Update event
- `deleteEventApi` - Delete event
- `moveEventToNextDayApi` - Move event to tomorrow
- `moveEventToNextMonthApi` - Move event to next month
- `getPendingAlertsApi` - Get tomorrow's events
- `markAlertSentApi` - Mark alert as sent
- `getEventsByDateApi` - Get events by month
- `searchEventsApi` - Search events

### 3. **Styling** (`src/css/Calendar.css`)

Premium, modern design with:

- **Gradient Backgrounds**: Beautiful purple gradient theme
- **Smooth Animations**: Fade-in, hover effects, pulse animations
- **Color-Coded Categories**: Each category has its own color
- **Responsive Layout**: Mobile-friendly design
- **Custom Scrollbars**: Styled scrollbars for alerts
- **Alert Animations**: Pulsing alert banner with ringing bell icon

## 🎯 Features

### Event Management

1. **Create Events**

   - Click any date on the calendar
   - Fill in title, description, notes, and category
   - Event appears on calendar with category color

2. **View/Edit Events**

   - Click on any event
   - View full details
   - Edit any field
   - Update or delete

3. **Delete Events**
   - Click event → Delete button
   - Confirmation modal
   - Event removed from calendar

### Alert System

1. **Automatic Alerts**

   - Backend checks daily at 9:00 AM
   - Frontend displays alert banner for tomorrow's events
   - Click banner to view all alerts

2. **Alert Actions** (3 options)

   - **❌ Cancel**: Delete the event
   - **➡️ Next Day**: Move to tomorrow
   - **📆 Next Month**: Move to same date next month

3. **Alert Display**
   - Shows event title, description, notes
   - Color-coded by category
   - Formatted date display
   - Action buttons for each alert

### Search & Filter

1. **Search Events**

   - Search by title, description, or notes
   - Real-time search
   - Clear button to reset

2. **Category Legend**
   - Visual guide to category colors
   - Quick reference for event types

### Calendar Views

1. **Month View** (default)

   - See all events for the month
   - Color-coded by category

2. **Week View**

   - Detailed week schedule
   - Time-based layout

3. **Day View**
   - Single day focus
   - Hourly breakdown

## 🎨 Design Features

### Color Scheme

- **Work**: Blue (#3b82f6)
- **Personal**: Purple (#8b5cf6)
- **Health**: Green (#10b981)
- **Finance**: Orange (#f59e0b)
- **Social**: Pink (#ec4899)
- **General**: Gray (#6b7280)

### Animations

- **Fade In**: Calendar and components fade in on load
- **Pulse**: Alert banner pulses to draw attention
- **Ring**: Bell icon rings in alert banner
- **Hover**: Smooth hover effects on all interactive elements
- **Transform**: Buttons lift on hover

### Responsive Design

- **Desktop**: Full-width calendar with sidebar
- **Tablet**: Adjusted layout
- **Mobile**: Stacked layout, full-width components

## 📱 User Interface

### Header

- Page title with emoji
- Search bar with clear button
- Responsive layout

### Alert Banner

- Appears when there are tomorrow's events
- Shows count of upcoming events
- Click to view all alerts
- Animated pulse effect

### Category Legend

- Shows all available categories
- Color-coded for easy reference
- Helps users choose categories

### Calendar

- Interactive FullCalendar
- Click dates to add events
- Click events to view/edit
- Multiple view options

### Modals

1. **Add Event Modal**

   - Date display
   - Title input (required)
   - Description textarea
   - Notes textarea
   - Category dropdown
   - Add/Cancel buttons

2. **Edit Event Modal**

   - Formatted date display
   - All event fields editable
   - Delete/Close/Update buttons
   - Confirmation for delete

3. **Alerts Modal**
   - List of tomorrow's events
   - Event cards with full details
   - Three action buttons per event
   - Scrollable list

## 🚀 Usage

### Adding an Event

1. Click on any date in the calendar
2. Modal opens with selected date
3. Enter event details:
   - Title (required)
   - Description (optional)
   - Notes (optional)
   - Category (dropdown)
4. Click "Add Event"
5. Event appears on calendar

### Editing an Event

1. Click on an event in the calendar
2. Modal opens with event details
3. Edit any field
4. Click "Update" to save
5. Or click "Delete" to remove

### Handling Alerts

1. Alert banner appears if events tomorrow
2. Click "View Alerts" button
3. See all tomorrow's events
4. For each event, choose:
   - **Cancel**: Remove the event
   - **Next Day**: Reschedule for day after tomorrow
   - **Next Month**: Reschedule for same date next month

### Searching Events

1. Type in search bar
2. Press Enter or click Search
3. Calendar shows matching events
4. Click Clear to show all events

## 🔧 Technical Details

### Dependencies

- **@fullcalendar/react**: Calendar component
- **@fullcalendar/daygrid**: Month view
- **@fullcalendar/timegrid**: Week/day views
- **@fullcalendar/interaction**: Click interactions
- **antd**: Modal, message, Spin components
- **axios**: API calls

### State Management

- `events`: Array of calendar events
- `alerts`: Array of pending alerts
- `selectedDate`: Currently selected date
- `selectedEvent`: Currently selected event
- `loading`: Loading state
- `searchQuery`: Search input value
- `formData`: Form input values
- Modal visibility states

### API Integration

All API calls use the centralized `api` instance from `Api/action.js`:

- Automatic token handling
- Error handling
- Loading states
- Success/error messages

## 📋 Event Data Structure

```javascript
{
  id: 1,
  title: "Team Meeting",
  description: "Quarterly review",
  event_date: "2025-12-10",
  notes: "Prepare slides\nReview metrics",
  category: "work",
  alert_sent: 0,
  is_deleted: 0,
  created_at: "2025-12-05T08:00:00.000Z",
  updated_at: "2025-12-05T08:00:00.000Z"
}
```

## 🎯 Alert Flow

```
1. User creates event for Dec 10
   ↓
2. Backend checks on Dec 9 at 9:00 AM
   ↓
3. Frontend loads alerts on page load
   ↓
4. Alert banner appears (if alerts exist)
   ↓
5. User clicks "View Alerts"
   ↓
6. Modal shows all tomorrow's events
   ↓
7. User chooses action:
   - Cancel → Event deleted
   - Next Day → Event moved to Dec 11
   - Next Month → Event moved to Jan 10
   ↓
8. Calendar refreshes with updated events
```

## 🎨 Customization

### Changing Colors

Edit `getCategoryColor` function in `Calendar.jsx`:

```javascript
const getCategoryColor = (category) => {
  const colors = {
    work: "#YOUR_COLOR",
    personal: "#YOUR_COLOR",
    // ... etc
  };
  return colors[category] || colors.general;
};
```

### Adding Categories

1. Add to dropdown in modals:

```jsx
<option value="new-category">New Category</option>
```

2. Add color in `getCategoryColor`
3. Add to legend

### Changing Alert Time

Backend setting in `calendar/alertScheduler.js`:

```javascript
cron.schedule('0 9 * * *', ...) // 9:00 AM
```

## 🐛 Troubleshooting

### Events Not Loading

1. Check backend is running
2. Check API URL in `Api/action.js`
3. Check browser console for errors
4. Verify JWT token is valid

### Alerts Not Showing

1. Create event for tomorrow
2. Refresh page
3. Check backend cron job is running
4. Check browser console

### Calendar Not Displaying

1. Verify FullCalendar packages installed
2. Check CSS file is imported
3. Check for JavaScript errors

## ✨ Features Summary

✅ **Event CRUD**: Create, Read, Update, Delete
✅ **Alert System**: Tomorrow's events with 3 actions
✅ **Search**: Find events by text
✅ **Categories**: Color-coded organization
✅ **Notes**: Store detailed information
✅ **Responsive**: Works on all devices
✅ **Beautiful UI**: Modern, gradient design
✅ **Animations**: Smooth, professional effects
✅ **Loading States**: User feedback
✅ **Error Handling**: Graceful error messages

## 🎉 You're All Set!

The calendar frontend is fully integrated with the backend and ready to use. Just make sure:

1. ✅ Backend server is running
2. ✅ Frontend server is running
3. ✅ You're logged in with valid token
4. ✅ Navigate to the Calendar page

Enjoy your new calendar system! 📅
