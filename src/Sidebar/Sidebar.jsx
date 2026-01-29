import React, { useEffect, useState, useRef } from "react";
import {
    Layout,
    Menu,
    Button,
    Avatar,
    Dropdown,
    Tooltip,
    Modal,
} from "antd";
import {
    Menu as MenuIcon,
    X,
    LayoutDashboard,
    DollarSign,
    Settings,
    LogOut,
    PlusIcon,
    Plus,
    Wallet,
    Calendar,
    StickyNote,
    ArrowRight,
    CalendarCheck,
    Calendar as CalendarIcon,
    ClockFading,
    TrendingUp,
    TimerResetIcon,
    Volume2,
} from "lucide-react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import "../css/Sidebar.css";
import "../css/Response.css";
import "../css/Calendar.css";
import Dashboard from "../Dashboard/Dashboard";
import AddRecord from "../Dashboard/AddRecord";
import AddCategories from "../Dashboard/AddCategeories";
import IncomeExpense from "../Dashboard/IncomeExpense";
import Approvals from "../Dashboard/Approvals";
import Income from "../Dashboard/Income";
import {
    apiLogout,
    getExpenseCategoriesApi,
    getUser,
    getPendingAlertsApi,
    deleteEventApi,
    moveEventToNextDayApi,
    moveEventToNextMonthApi,
    clearAuthData,
    getApprovalsApi
} from "../../Api/action";
import { CommonToaster } from "../../Common/CommonToaster";
import SettingPage from "../Dashboard/Settings";
import Modals from "../Dashboard/Modals";
import dayjs from "dayjs";
import WalletPage from "../Dashboard/Wallet";
import CalendarPage from "../Dashboard/Calendar";
const { Sider, Content, Header } = Layout;

export default function SideBarLayout() {
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState("");
    const [pendingCount, setPendingCount] = useState(0);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const previousPendingCount = useRef(0);

    const [branch, setBranch] = useState("Select Branch");
    const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
    const [total, setTotal] = useState("");
    const [mainCategory, setMainCategory] = useState("Select Main Category");
    const [subCategory, setSubCategory] = useState("Select Category");
    const [description, setDescription] = useState("");
    const [vendorName, setVendorName] = useState("");
    const [vendorNumber, setVendorNumber] = useState("");
    const [endDate, setEndDate] = useState(dayjs().format("YYYY-MM-DD"));
    const [expenseCategories, setExpenseCategories] = useState({});
    const [incomeCategories, setIncomeCategories] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [isAlertModalVisible, setIsAlertModalVisible] = useState(false);

    const [isMobile, setIsMobile] = useState(false);
    const isAdmin = user?.role === "admin";

    useEffect(() => {
        if (user?.role === "user") {
            if (location.pathname === "/approvals" || location.pathname === "/wallet") {
                navigate("/dashboard", { replace: true });
            }
        }
    }, [user, location]);


    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth <= 768) {
                setIsMobile(true);
                setCollapsed(true);
            } else {
                setIsMobile(false);
                setCollapsed(false);
            }
        };

        handleResize();
        window.addEventListener("resize", handleResize);

        return () => window.removeEventListener("resize", handleResize);
    }, []);


    useEffect(() => {
        getUserData()
    }, [])

    useEffect(() => {
        if (user) {
            loadPendingApprovals();
        }
    }, [user]);

    useEffect(() => {
        const update = () => loadPendingApprovals();
        window.addEventListener("incomeExpenseUpdated", update);

        return () => window.removeEventListener("incomeExpenseUpdated", update);
    }, [user]);

    // Poll for new approvals every 20 seconds
    useEffect(() => {
        if (!user) return; // Don't start polling until user is loaded

        const pollInterval = setInterval(() => {
            loadPendingApprovals();
        }, 20000); // Check every 20 seconds

        return () => clearInterval(pollInterval);
    }, [user]);

    useEffect(() => {
        loadAlerts();
    }, []);

    // Listen for calendar events updates
    useEffect(() => {
        const update = () => loadAlerts();
        window.addEventListener("calendarEventsUpdated", update);

        return () => window.removeEventListener("calendarEventsUpdated", update);
    }, []);

    useEffect(() => {
        async function loadCategories() {
            const exp = await getExpenseCategoriesApi();
            const grouped = exp.reduce((acc, item) => {
                const main = item.main_category;
                const sub = item.sub_category;

                if (!acc[main]) acc[main] = [];
                acc[main].push(sub);

                return acc;
            }, {});

            setExpenseCategories(grouped);
        }

        loadCategories();
    }, []);


    // Function to play notification sound - Custom Alert
    const playNotificationSound = () => {
        try {
            // Create a new audio instance
            const audio = new Audio('/Notification_sound/alert.mp3');
            audio.volume = 1.0; // Set to full volume

            // Attempt to play the audio
            const playPromise = audio.play();

            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log("Notification sound played successfully");
                    })
                    .catch(error => {
                        console.error("Error playing notification sound:", error);
                        // If autoplay is blocked, show a visual notification instead
                        CommonToaster("New approvals received! (Sound blocked by browser)", "info");
                    });
            }
        } catch (error) {
            console.error("Error creating audio:", error);
        }
    };

    const loadPendingApprovals = async () => {
        try {
            const response = await getApprovalsApi();
            let newCount = 0;

            if (response && response.data && Array.isArray(response.data)) {
                // If total is provided, use it, otherwise fallback to current page length
                newCount = response.total ?? response.data.length;
            } else if (Array.isArray(response)) {
                newCount = response.length;
            }

            // Check if there are new approvals (count increased) AND user is admin
            // Only play sound if this is not the initial load (previousPendingCount has been set)
            const isInitialLoad = previousPendingCount.current === 0 && newCount > 0;
            const hasNewApprovals = newCount > previousPendingCount.current;

            if (hasNewApprovals && user?.role === "admin" && !isInitialLoad) {
                // Play notification sound for new approvals (admin only)
                playNotificationSound();
                CommonToaster(`${newCount - previousPendingCount.current} new approval(s) received!`, "info");
                // Dispatch event to notify Approvals page to refresh
                window.dispatchEvent(new Event("newApprovalsReceived"));
            }

            // Update the counts
            previousPendingCount.current = newCount;
            setPendingCount(newCount);
        } catch (error) {
            console.log("Approval count error:", error);
        }
    };

    const getUserData = async () => {
        try {
            const response = await getUser();
            setUser(response || "")
            console.log("get user data", response)
        } catch (error) {
            console.log("get user error", error)
        }
    }

    const loadAlerts = async () => {
        try {
            const response = await getPendingAlertsApi();
            // Filter out completed events from alerts
            const pendingAlerts = (response.alerts || []).filter(alert => alert.status !== 'completed');
            setAlerts(pendingAlerts);

            if (pendingAlerts.length > 0) {
                setIsAlertModalVisible(true);
            } else {
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

    // Handle alert actions
    const handleAlertAction = async (eventId, action) => {
        try {
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
            await loadAlerts();
            // Notify other components (like Calendar page) to update
            window.dispatchEvent(new Event("calendarEventsUpdated"));
        } catch (error) {
            console.error("Error handling alert action:", error);
            CommonToaster(error.message || "Failed to perform action", "error");
        } finally {
            setIsAlertModalVisible(false);
        }
    };

    const getInitials = (fullName) => {
        if (!fullName) return "";

        const words = fullName.trim().split(" ");

        if (words.length === 1) {
            return words[0].substring(0, 2).toUpperCase();
        }
        return (words[0][0] + words[1][0]).toUpperCase();
    };



    const menuKeyMap = {
        "/dashboard": "1",
        "/categories": "2",
        "/approved-expense": "3",
        "/approvals": "4",
        "/wallet": "5",
        "/bills": "6",
        "/savings": "7",
        "/settings": "8",
        "/calendar": "9",
        "/income": "10",
    };

    const selectedKey = menuKeyMap[location.pathname] || "1";

    const handleMenuClick = (e) => {
        const routeMap = {
            1: "/dashboard",
            2: "/categories",
            3: "/approved-expense",
            4: "/approvals",
            5: "/wallet",
            6: "/bills",
            7: "/savings",
            8: "/settings",
            9: "/calendar",
            10: "/income",
        };

        navigate(routeMap[e.key]);

        if (isMobile) {
            setCollapsed(true);
        }
    };

    // Profile dropdown
    const profileMenu = {
        items: [
            {
                key: "logout",
                label: (
                    <span style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        color: "red",
                        fontWeight: 500,
                    }}>
                        <LogOut size={16} /> Logout
                    </span>
                ),
                onClick: async () => {
                    try {
                        await apiLogout();
                        navigate("/login");
                        CommonToaster("Your'e logged out!", 'error');
                    } catch (e) {
                        console.error(e);
                        clearAuthData();
                        navigate("/login");
                    }
                }
            }
        ]
    };

    return (
        <Layout className="sidebar-layout">
            <Button
                className="new-category"
                onClick={() => setIsCategoryModalOpen(true)}
            >
                <Plus size={20} /> Add Expense
            </Button>

            {/* Add Category Modal */}
            <Modals
                open={isCategoryModalOpen}
                type="expense"
                onClose={() => setIsCategoryModalOpen(false)}
                branch={branch}
                setBranch={setBranch}
                date={date}
                setDate={setDate}
                total={total}
                setTotal={setTotal}
                mainCategory={mainCategory}
                setMainCategory={setMainCategory}
                subCategory={subCategory}
                setSubCategory={setSubCategory}
                description={description}
                setDescription={setDescription}
                expenseCategories={expenseCategories}
                incomeCategories={incomeCategories}
                vendorName={vendorName}
                setVendorName={setVendorName}
                vendorNumber={vendorNumber}
                setVendorNumber={setVendorNumber}
                endDate={endDate}
                setEndDate={setEndDate}
            />

            {/* Sidebar */}
            <Sider
                trigger={null}
                collapsible
                collapsed={collapsed}
                width={240}
                className={`premium-sider ${collapsed ? "collapsed" : ""}`}
            >
                <div onClick={() => {
                    navigate("/dashboard")
                }} className="sider-header">
                    {collapsed && <div className="logo-circle"><img src="/images/cashmaster_logo_main.png" alt="" /></div>}
                    {!collapsed && <img src="/images/cashmaster_logo.png" alt="" />}
                </div>

                {/* Main Menu */}
                <div className="menu-section">
                    <p className={`menu-title ${collapsed ? "hidden" : ""}`}>Main Menu</p>
                    <Menu
                        mode="inline"
                        theme="light"
                        selectedKeys={[selectedKey]}
                        onClick={handleMenuClick}
                        className="premium-menu"
                        items={[
                            { key: "1", icon: <LayoutDashboard size={16} />, label: "Dashboard" },
                            { key: "3", icon: <DollarSign size={16} />, label: "Approved / Expense" },

                            ...(isAdmin ? [
                                { key: "4", icon: <TimerResetIcon size={16} />, label: "Pending Approvals" },
                                { key: "5", icon: <Wallet size={16} />, label: "Wallet" },
                                { key: "10", icon: <TrendingUp size={16} />, label: "Income" },
                            ] : []),
                        ]}
                    />
                </div>

                {/* Bottom Menu */}
                <div className="menu-section bottom-section">
                    <p className={`menu-title ${collapsed ? "hidden" : ""}`}>Other</p>
                    <Menu
                        mode="inline"
                        theme="light"
                        selectedKeys={[selectedKey]}
                        onClick={handleMenuClick}
                        className="premium-menu"
                        items={[
                            { key: "8", icon: <Settings size={16} />, label: "Settings" },
                            { key: "9", icon: <Calendar size={16} />, label: "Schedule Calendar" },
                            { key: "2", icon: <PlusIcon size={16} />, label: isAdmin ? "Add Category" : "Categories" },
                        ]}
                    />
                </div>

                {/* Collapse Button */}
                <div className="collapse-btn-container">
                    <Button
                        type="text"
                        icon={collapsed ? <MenuIcon size={18} /> : <X size={18} />}
                        onClick={() => setCollapsed(!collapsed)}
                        className="collapse-btn"
                    />
                </div>
            </Sider>

            {/* Content */}
            <Layout className="content-layout">
                {/* Header */}
                <Header className="dashboard-header">
                    {isMobile && (
                        <Button
                            type="text"
                            onClick={() => setCollapsed(!collapsed)}
                            className="mobile-menu-btn"
                        >
                            {collapsed ? <MenuIcon size={22} /> : <X size={22} />}
                        </Button>
                    )}

                    <h2 className="header-title">Hello, {user.name}</h2>
                    <div className="header-right">
                        {isAdmin ? (
                            <>
                                <Tooltip title="Test notification sound">
                                    <Button
                                        onClick={() => {
                                            playNotificationSound();
                                            CommonToaster("Testing notification sound", "info");
                                        }}
                                        type="text"
                                        className="icon-btn"
                                        style={{ marginRight: '8px' }}
                                    >
                                        <Volume2 size={18} />
                                    </Button>
                                </Tooltip>
                                <Tooltip title="Approvals pending">
                                    <Button onClick={() => navigate("/approvals")} type="text" className="icon-btn notification-btn">
                                        <ClockFading size={18} />
                                        {pendingCount > 0 && (
                                            <span className="pending-badge">{pendingCount}</span>
                                        )}
                                    </Button>
                                </Tooltip>
                            </>
                        ) : ""}
                        <Dropdown menu={profileMenu} placement="bottomRight" arrow>
                            <Avatar
                                size={36}
                                style={{ backgroundColor: "#d4af37", cursor: "pointer" }}
                            >
                                {getInitials(user?.name)}
                            </Avatar>
                        </Dropdown>
                    </div>
                </Header>

                {/* Alert Banner */}
                <div style={{ backgroundColor: "#261d011a" }}>
                    {alerts.length > 0 && (
                        <div className="alerts-banner" onClick={() => setIsAlertModalVisible(true)}>
                            <span className="alert-icon">🔔</span>
                            <span>You have {alerts.length} upcoming event(s)!</span>
                            <button className="view-alerts-btn">View Alerts</button>
                        </div>
                    )}
                </div>

                {/* Main Content */}
                <Content className="main-content">
                    <Routes>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/add-record" element={<AddRecord />} />
                        <Route path="/categories" element={<AddCategories />} />
                        <Route path="/approved-expense" element={<IncomeExpense />} />
                        <Route path="/approvals" element={<Approvals />} />
                        <Route path="/wallet" element={<WalletPage />} />
                        <Route path="/settings" element={<SettingPage />} />
                        <Route path="/calendar" element={<CalendarPage />} />
                        <Route path="/income" element={<Income />} />
                    </Routes>
                </Content>
            </Layout>

            {/* Calendar Alerts Modal */}
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
                                    <strong style={{ display: "flex", alignItems: "center", gap: "5px" }}><StickyNote color="#d4af37" size={14} />Notes:</strong>
                                    <p>{alert.notes}</p>
                                </div>
                            )}
                            <div className="alert-date">
                                <CalendarIcon size={18} className="next-month-icon" /> {new Date(alert.event_date).toLocaleDateString('en-US', {
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
                                    <X size={20} className="cancel-icon" /> Cancel Event
                                </button>
                                <button
                                    onClick={() => handleAlertAction(alert.id, "nextDay")}
                                    className="alert-btn next-day-btn"
                                >
                                    <ArrowRight size={20} className="next-day-icon" /> Next Day
                                </button>
                                <button
                                    onClick={() => handleAlertAction(alert.id, "nextMonth")}
                                    className="alert-btn next-month-btn"
                                >
                                    <CalendarCheck size={20} className="next-month-icon" /> Next Month
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </Modal>
        </Layout>
    );
}

