import React, { useState, useEffect, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { message, Modal, Popconfirm, Select, Spin } from "antd";
import * as Icons from "lucide-react";
import {
    createEventApi,
    getEventsApi,
    updateEventApi,
    deleteEventApi,
    moveEventToNextDayApi,
    moveEventToNextMonthApi,
    getPendingAlertsApi,
    searchEventsApi,
    markEventCompletedApi
} from "../../Api/action";
import "../css/Calendar.css";
import { CommonToaster } from "../../Common/CommonToaster";
export default function CalendarPage() {
    const [events, setEvents] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [highlightedIds, setHighlightedIds] = useState([]);
    const calendarRef = React.useRef(null);
    // Form states
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        notes: "",
        category: "general"
    });
    // Modal states
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [isAlertModalVisible, setIsAlertModalVisible] = useState(false);

    useEffect(() => {
        loadEvents();
        loadAlerts(true);
    }, []);

    useEffect(() => {
        const jumpHandler = (e) => {
            const date = e.detail;
            const calendarApi = calendarRef.current?.getApi();
            if (calendarApi) {
                calendarApi.gotoDate(date);
            }
        };
        window.addEventListener("calendar-jump", jumpHandler);
        return () => window.removeEventListener("calendar-jump", jumpHandler);
    }, []);

    // Listen for calendar events updates from other components (like Sidebar)
    useEffect(() => {
        const updateHandler = () => {
            loadEvents();
            loadAlerts(false); // Don't show modal on updates, just refresh data
        };
        window.addEventListener("calendarEventsUpdated", updateHandler);
        return () => window.removeEventListener("calendarEventsUpdated", updateHandler);
    }, []);

    // Load all events
    const loadEvents = async () => {
        try {
            setLoading(true);
            const response = await getEventsApi();
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const calendarEvents = response.events.map(event => {
                const eventDate = new Date(event.event_date);
                eventDate.setHours(0, 0, 0, 0);
                let backgroundColor, borderColor;
                if (event.status === 'completed') {
                    backgroundColor = '#10b981';
                    borderColor = '#10b981';
                } else if (eventDate < today) {
                    backgroundColor = '#ef4444';
                    borderColor = '#ef4444';
                } else {
                    backgroundColor = getCategoryColor(event.category);
                    borderColor = getCategoryColor(event.category);
                }

                return {
                    id: event.id,
                    title: event.title,
                    start: eventDate,
                    extendedProps: {
                        description: event.description,
                        notes: event.notes,
                        category: event.category,
                        alert_sent: event.alert_sent,
                        status: event.status || 'pending'
                    },
                    backgroundColor,
                    borderColor
                };
            });
            setEvents(calendarEvents);
        } catch (error) {
            console.error("Error loading events:", error);
            CommonToaster("Failed to load events", "error");
        } finally {
            setLoading(false);
        }
    };

    // Load pending alerts
    const loadAlerts = async (showModal = false) => {
        try {
            const response = await getPendingAlertsApi();
            // Filter out completed events from alerts
            const pendingAlerts = (response.alerts || []).filter(alert => alert.status !== 'completed');
            setAlerts(pendingAlerts);

            if (pendingAlerts.length > 0 && showModal) {
                const alertShownKey = 'calendarAlertShown';
                const hasShownAlert = sessionStorage.getItem(alertShownKey);

                if (!hasShownAlert) {
                    setIsAlertModalVisible(true);
                    sessionStorage.setItem(alertShownKey, 'true');
                }
            } else if (pendingAlerts.length === 0) {
                // Close modal if no pending alerts
                setIsAlertModalVisible(false);
            }
        } catch (error) {
            console.error("Error loading alerts:", error);
        }
    };

    // Get color based on category
    const getCategoryColor = (category) => {
        const colors = {
            work: "#3b82f6",
            personal: "#8b5cf6",
            health: "#10b981",
            finance: "#f59e0b",
            social: "#ec4899",
            general: "#6b7280"
        };
        return colors[category] || colors.general;
    };

    // Handle date click (add event)
    const handleDateClick = (info) => {
        setSelectedDate(info.dateStr);
        setFormData({
            title: "",
            description: "",
            notes: "",
            category: "general"
        });
        setIsAddModalVisible(true);
    };

    // Handle event click (view/edit event)
    const handleEventClick = (info) => {
        const event = info.event;
        setSelectedEvent({
            id: event.id,
            title: event.title,
            date: event.startStr,
            description: event.extendedProps.description,
            notes: event.extendedProps.notes,
            category: event.extendedProps.category,
            status: event.extendedProps.status || 'pending'
        });
        setFormData({
            title: event.title,
            description: event.extendedProps.description || "",
            notes: event.extendedProps.notes || "",
            category: event.extendedProps.category || "general"
        });
        setIsEditModalVisible(true);
    };

    // Add new event
    const handleAddEvent = async () => {
        if (!formData.title.trim()) {
            CommonToaster("Please enter event title", "error");
            return;
        }
        try {
            setLoading(true);
            await createEventApi({
                title: formData.title,
                description: formData.description,
                event_date: selectedDate,
                notes: formData.notes,
                category: formData.category
            });
            CommonToaster("Event created successfully!", "success");
            setIsAddModalVisible(false);
            loadEvents();
            loadAlerts(false); // Don't auto-show modal
            // Notify other components (like Sidebar) to update alerts
            window.dispatchEvent(new Event("calendarEventsUpdated"));
        } catch (error) {
            console.error("Error creating event:", error);
            CommonToaster(error.message || "Failed to create event", "error");
        } finally {
            setLoading(false);
        }
    };

    // Update event
    const handleUpdateEvent = async () => {
        if (!formData.title.trim()) {
            CommonToaster("Please enter event title", "error");
            return;
        }
        try {
            setLoading(true);
            await updateEventApi(selectedEvent.id, {
                title: formData.title,
                description: formData.description,
                notes: formData.notes,
                category: formData.category
            });

            CommonToaster("Event updated successfully!", "success");
            setIsEditModalVisible(false);
            loadEvents();
            loadAlerts(false); // Don't auto-show modal
            // Notify other components (like Sidebar) to update alerts
            window.dispatchEvent(new Event("calendarEventsUpdated"));
        } catch (error) {
            console.error("Error updating event:", error);
            CommonToaster(error.message || "Failed to update event", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteEvent = async () => {
        const eventId = selectedEvent?.id;
        if (!eventId) {
            CommonToaster("Invalid event selected.", "error");
            return;
        }
        try {
            setLoading(true);
            const response = await deleteEventApi(eventId);
            CommonToaster("Event deleted successfully!", "success");
            setIsEditModalVisible(false);
            setEvents([]);
            await loadEvents();
            await loadAlerts(false); // Don't auto-show modal
            // Notify other components (like Sidebar) to update alerts
            window.dispatchEvent(new Event("calendarEventsUpdated"));
        } catch (error) {
            console.error("❌ Delete error:", error);
            CommonToaster(error.response?.data?.message || "Failed to delete event", "error");
        } finally {
            setLoading(false);
        }
    };

    // Mark event as completed
    const handleCompleteEvent = async () => {
        const eventId = selectedEvent?.id;
        if (!eventId) {
            CommonToaster("Invalid event selected.", "error");
            return;
        }
        try {
            setLoading(true);
            await markEventCompletedApi(eventId);
            CommonToaster("Event marked as completed!", "success");
            setIsEditModalVisible(false);
            setIsAlertModalVisible(false); // Close alert modal too
            await loadEvents();
            await loadAlerts(false);
            // Notify other components (like Sidebar) to update alerts
            window.dispatchEvent(new Event("calendarEventsUpdated"));
        } catch (error) {
            console.error("❌ Complete error:", error);
            CommonToaster(error.response?.data?.message || "Failed to mark event as completed", "error");
        } finally {
            setLoading(false);
        }
    };

    // Handle alert actions
    const handleAlertAction = async (eventId, action) => {
        try {
            setLoading(true);
            switch (action) {
                case "cancel":
                    await deleteEventApi(eventId);
                    CommonToaster("Event cancelled", "success");
                    setIsAlertModalVisible(false);
                    break;
                case "nextDay":
                    await moveEventToNextDayApi(eventId);
                    CommonToaster("Event moved to next day", "success");
                    setIsAlertModalVisible(false);
                    break;
                case "nextMonth":
                    await moveEventToNextMonthApi(eventId);
                    CommonToaster("Event moved to next month", "success");
                    setIsAlertModalVisible(false);
                    break;
            }
            loadEvents();
            loadAlerts(false); // Don't auto-show modal
            window.dispatchEvent(new Event("calendarEventsUpdated"));
        } catch (error) {
            console.error("Error handling alert action:", error);
            CommonToaster(error.message || "Failed to perform action", "error");
        } finally {
            setLoading(false);
            setIsAlertModalVisible(false);
        }
    };

    // Search events
    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            setHighlightedIds([]);
            loadEvents();
            return;
        }
        try {
            setLoading(true);
            const response = await searchEventsApi(searchQuery);

            if (!response.events.length) {
                message.warning("No matching events found");
                setEvents([]);
                setHighlightedIds([]);
                return;
            }
            const calendarEvents = response.events.map(event => ({
                id: event.id,
                title: event.title,
                start: new Date(event.event_date),
                extendedProps: {
                    description: event.description,
                    notes: event.notes,
                    category: event.category
                },
                backgroundColor: getCategoryColor(event.category),
                borderColor: getCategoryColor(event.category)
            }));
            setHighlightedIds(response.events.map(e => e.id));
            setEvents(calendarEvents);
            const firstEventDate = new Date(response.events[0].event_date);
            window.dispatchEvent(
                new CustomEvent("calendar-jump", { detail: firstEventDate })
            );
            message.success(`Found ${response.events.length} event(s)`);
        } catch (error) {
            console.error("Search error:", error);
            message.error("Failed to search events");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="calendar-wrapper">
            <Spin spinning={loading}>
                <div className="calendar-header">
                    <h1 className="page-title">📅 Calendar & Events</h1>
                    {/* Search Bar */}
                    <div className="search-bar">
                        <input
                            type="text"
                            placeholder="Search events..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                            className="search-input"
                        />
                        <button onClick={handleSearch} className="search-btn">
                            🔍 Search
                        </button>
                        {searchQuery && (
                            <button
                                style={{ marginTop: "0px" }}
                                onClick={() => {
                                    setSearchQuery("");
                                    loadEvents();
                                }}
                                className="clear-btn"
                            >
                                ✕ Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Category Legend */}
                <div className="category-legend">
                    <span className="legend-title">Categories:</span>
                    <span className="legend-item" style={{ color: getCategoryColor("work") }}>● Work</span>
                    <span className="legend-item" style={{ color: getCategoryColor("personal") }}>● Personal</span>
                    <span className="legend-item" style={{ color: getCategoryColor("health") }}>● Health</span>
                    <span className="legend-item" style={{ color: getCategoryColor("finance") }}>● Finance</span>
                    <span className="legend-item" style={{ color: getCategoryColor("social") }}>● Social</span>
                    <span className="legend-item" style={{ color: getCategoryColor("general") }}>● General</span>
                </div>

                {/* Calendar */}
                <div className="calendar-box">
                    <FullCalendar
                        ref={calendarRef}
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        initialView="dayGridMonth"
                        selectable={true}
                        dateClick={handleDateClick}
                        eventClick={handleEventClick}
                        events={events}
                        height="75vh"
                        eventDidMount={(info) => {
                            if (highlightedIds.includes(Number(info.event.id))) {
                                info.el.classList.add("highlighted-event");
                            }
                        }}
                        dayCellClassNames={(arg) => {
                            // Get all events for this specific day
                            const dayStr = arg.date.toISOString().split('T')[0];
                            const dayEvents = events.filter(event => {
                                const eventDateStr = new Date(event.start).toISOString().split('T')[0];
                                return eventDateStr === dayStr;
                            });

                            // If there are events on this day
                            if (dayEvents.length > 0) {
                                const allCompleted = dayEvents.every(event => event.extendedProps.status === 'completed');

                                if (allCompleted) {
                                    return ['day-all-completed'];
                                } else {
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    const eventDate = new Date(arg.date);
                                    eventDate.setHours(0, 0, 0, 0);
                                    if (eventDate < today) {
                                        return ['day-has-pending'];
                                    }
                                }
                            }
                            return [];
                        }}
                        headerToolbar={{
                            left: "prev,next today",
                            center: "title",
                            right: "dayGridMonth,timeGridWeek,timeGridDay",
                        }}
                    />
                </div>

                {/* Add Event Modal */}
                <Modal
                    title={`Add Note - ${selectedDate}`}
                    open={isAddModalVisible}
                    onOk={handleAddEvent}
                    onCancel={() => setIsAddModalVisible(false)}
                    okText="Add Note"
                    cancelText="Cancel"
                >
                    <div className="event-form">
                        <input
                            type="text"
                            placeholder="Note Title *"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="form-input"
                        />
                        <textarea
                            placeholder="Note Description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="form-textarea"
                            rows={3}
                        />
                        <textarea
                            placeholder="Notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="form-textarea"
                            rows={4}
                        />
                        <Select
                            value={formData.category}
                            onChange={(value) => setFormData({ ...formData, category: value })}
                            className="form-select"
                            style={{ width: '100%' }}
                            options={[
                                { value: "general", label: "General" },
                                { value: "work", label: "Work" },
                                { value: "personal", label: "Personal" },
                                { value: "health", label: "Health" },
                                { value: "finance", label: "Finance" },
                                { value: "social", label: "Social" },
                            ]}
                        />
                    </div>
                </Modal>

                {/* Edit Event Modal */}
                <Modal
                    title="Event Details"
                    open={isEditModalVisible}
                    onOk={handleUpdateEvent}
                    onCancel={() => setIsEditModalVisible(false)}
                    okText="Update"
                    cancelText="Close"
                    footer={[
                        <Popconfirm
                            key="delete"
                            title="Delete Event"
                            description="Are you sure you want to delete this event?"
                            okText="Yes, Delete"
                            cancelText="No"
                            onConfirm={handleDeleteEvent}
                        >
                            <button className="delete-event-btn">
                                Delete
                            </button>
                        </Popconfirm>,
                        <button
                            key="complete"
                            onClick={handleCompleteEvent}
                            className="complete-event-btn"
                            disabled={selectedEvent?.status === 'completed'}
                            style={{
                                backgroundColor: selectedEvent?.status === 'completed' ? '#10b981' : '#d4af37',
                                cursor: selectedEvent?.status === 'completed' ? 'not-allowed' : 'pointer',
                                opacity: selectedEvent?.status === 'completed' ? 0.6 : 1
                            }}
                        >
                            {selectedEvent?.status === 'completed' ? '✓ Completed' : 'Complete'}
                        </button>,
                        // Only show Update button if event is not completed
                        selectedEvent?.status !== 'completed' && (
                            <button
                                key="update"
                                onClick={handleUpdateEvent}
                                className="update-event-btn"
                            >
                                Update
                            </button>
                        )
                    ].filter(Boolean)}
                >
                    {selectedEvent && (
                        <div className="event-form">
                            <div className="event-date-display">
                                📅 {new Date(selectedEvent.date).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </div>
                            <input
                                type="text"
                                placeholder="Event Title *"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="form-input"
                            />
                            <textarea
                                placeholder="Description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="form-textarea"
                                rows={3}
                            />
                            <textarea
                                placeholder="Notes"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="form-textarea"
                                rows={4}
                            />
                            <Select
                                value={formData.category}
                                onChange={(value) => setFormData({ ...formData, category: value })}
                                className="form-select"
                                style={{ width: '100%' }}
                                options={[
                                    { value: "general", label: "General" },
                                    { value: "work", label: "Work" },
                                    { value: "personal", label: "Personal" },
                                    { value: "health", label: "Health" },
                                    { value: "finance", label: "Finance" },
                                    { value: "social", label: "Social" },
                                ]}
                            />
                        </div>
                    )}
                </Modal>

                {/* Alerts Modal */}
                <Modal
                    title="🔔 Today & Tomorrow's Events"
                    open={isAlertModalVisible}
                    onCancel={() => setIsAlertModalVisible(false)}
                    footer={null}
                    width={700}
                >
                    <div className="alerts-container">
                        {alerts.map((alert) => (
                            <div key={alert.id} className="alert-card">
                                <div className="alert-header">
                                    <h3>{alert.title}</h3>
                                    <span className="alert-category" style={{
                                        backgroundColor: getCategoryColor(alert.category)
                                    }}>
                                        {alert.category}
                                    </span>
                                </div>
                                {alert.description && (
                                    <p className="alert-description">{alert.description}</p>
                                )}
                                {alert.notes && (
                                    <div className="alert-notes">
                                        <strong style={{ display: "flex", alignItems: "center", gap: "5px" }}><Icons.StickyNote color="#d4af37" size={14} />Notes:</strong>
                                        <p>{alert.notes}</p>
                                    </div>
                                )}
                                <div className="alert-date">
                                    <Icons.Calendar size={18} className="next-month-icon" /> {new Date(alert.event_date).toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </div>
                                <div className="alert-actions">
                                    <button
                                        onClick={() => handleAlertAction(alert.id, "cancel")}
                                        className="alert-btn cancel-alert-btn"
                                    >
                                        <Icons.X size={20} className="cancel-icon" /> Cancel Event
                                    </button>
                                    <button
                                        onClick={() => handleAlertAction(alert.id, "nextDay")}
                                        className="alert-btn next-day-btn"
                                    >
                                        <Icons.ArrowRight size={20} className="next-day-icon" /> Next Day
                                    </button>
                                    <button
                                        onClick={() => handleAlertAction(alert.id, "nextMonth")}
                                        className="alert-btn next-month-btn"
                                    >
                                        <Icons.CalendarCheck size={20} className="next-month-icon" /> Next Month
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </Modal>
            </Spin>
        </div>
    );
}
