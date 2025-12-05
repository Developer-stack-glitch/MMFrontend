import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { message, Modal, Popconfirm, Spin } from "antd";
import * as Icons from "lucide-react";
import {
    createEventApi,
    getEventsApi,
    updateEventApi,
    deleteEventApi,
    moveEventToNextDayApi,
    moveEventToNextMonthApi,
    getPendingAlertsApi,
    searchEventsApi
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

    // Load events on component mount
    useEffect(() => {
        loadEvents();
        loadAlerts();
    }, []);

    // Load all events
    const loadEvents = async () => {
        try {
            setLoading(true);
            const response = await getEventsApi();

            // Transform events for FullCalendar
            const calendarEvents = response.events.map(event => ({
                id: event.id,
                title: event.title,
                start: event.event_date,
                extendedProps: {
                    description: event.description,
                    notes: event.notes,
                    category: event.category,
                    alert_sent: event.alert_sent
                },
                backgroundColor: getCategoryColor(event.category),
                borderColor: getCategoryColor(event.category)
            }));

            setEvents(calendarEvents);
        } catch (error) {
            console.error("Error loading events:", error);
            CommonToaster("Failed to load events", "error");
        } finally {
            setLoading(false);
        }
    };

    // Load pending alerts
    const loadAlerts = async () => {
        try {
            const response = await getPendingAlertsApi();
            setAlerts(response.alerts || []);

            if (response.alerts && response.alerts.length > 0) {
                setIsAlertModalVisible(true);
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
            category: event.extendedProps.category
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
            loadAlerts();
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
            await loadAlerts();

        } catch (error) {
            console.error("❌ Delete error:", error);
            CommonToaster(error.response?.data?.message || "Failed to delete event", "error");
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
                    break;
                case "nextDay":
                    await moveEventToNextDayApi(eventId);
                    CommonToaster("Event moved to next day", "success");
                    break;
                case "nextMonth":
                    await moveEventToNextMonthApi(eventId);
                    CommonToaster("Event moved to next month", "success");
                    break;
            }

            loadEvents();
            loadAlerts();
        } catch (error) {
            console.error("Error handling alert action:", error);
            CommonToaster(error.message || "Failed to perform action", "error");
        } finally {
            setLoading(false);
        }
    };

    // Search events
    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            loadEvents();
            return;
        }

        try {
            setLoading(true);
            const response = await searchEventsApi(searchQuery);

            const calendarEvents = response.events.map(event => ({
                id: event.id,
                title: event.title,
                start: event.event_date,
                extendedProps: {
                    description: event.description,
                    notes: event.notes,
                    category: event.category
                },
                backgroundColor: getCategoryColor(event.category),
                borderColor: getCategoryColor(event.category)
            }));

            setEvents(calendarEvents);
            message.success(`Found ${response.events.length} event(s)`);
        } catch (error) {
            console.error("Error searching events:", error);
            message.error("Failed to search events");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="calendar-wrapper">
            <Spin spinning={loading}>
                {/* Alerts Banner */}
                {alerts.length > 0 && (<div className="alerts-banner" onClick={() => setIsAlertModalVisible(true)}> <span className="alert-icon">🔔</span> <span>You have {alerts.length} event(s) tomorrow!</span> <button className="view-alerts-btn">View Alerts</button> </div>)}
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
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        initialView="dayGridMonth"
                        selectable={true}
                        dateClick={handleDateClick}
                        eventClick={handleEventClick}
                        events={events}
                        height="75vh"
                        headerToolbar={{
                            left: "prev,next today",
                            center: "title",
                            right: "dayGridMonth,timeGridWeek,timeGridDay",
                        }}
                    />
                </div>

                {/* Add Event Modal */}
                <Modal
                    title={`Add Event - ${selectedDate}`}
                    open={isAddModalVisible}
                    onOk={handleAddEvent}
                    onCancel={() => setIsAddModalVisible(false)}
                    okText="Add Event"
                    cancelText="Cancel"
                >
                    <div className="event-form">
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

                        <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="form-select"
                        >
                            <option value="general">General</option>
                            <option value="work">Work</option>
                            <option value="personal">Personal</option>
                            <option value="health">Health</option>
                            <option value="finance">Finance</option>
                            <option value="social">Social</option>
                        </select>
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
                            key="cancel"
                            onClick={() => setIsEditModalVisible(false)}
                            className="cancel-event-btn"
                        >
                            Close
                        </button>,

                        <button
                            key="update"
                            onClick={handleUpdateEvent}
                            className="update-event-btn"
                        >
                            Update
                        </button>
                    ]}
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

                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="form-select"
                            >
                                <option value="general">General</option>
                                <option value="work">Work</option>
                                <option value="personal">Personal</option>
                                <option value="health">Health</option>
                                <option value="finance">Finance</option>
                                <option value="social">Social</option>
                            </select>
                        </div>
                    )}
                </Modal>

                {/* Alerts Modal */}
                <Modal
                    title="🔔 Tomorrow's Events"
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
