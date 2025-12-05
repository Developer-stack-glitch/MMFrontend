import React, { useEffect, useState } from "react";
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
    FileCheck2,
    Settings,
    Bell,
    LogOut,
    PlusIcon,
    Plus,
    Wallet,
    Calendar,
} from "lucide-react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import "../css/Sidebar.css";
import "../css/Response.css";
import Dashboard from "../Dashboard/Dashboard";
import AddRecord from "../Dashboard/AddRecord";
import AddCategories from "../Dashboard/AddCategeories";
import IncomeExpense from "../Dashboard/IncomeExpense";
import Approvals from "../Dashboard/Approvals";
import { apiLogout, getExpenseCategoriesApi, getIncomeCategoriesApi, getUser } from "../../Api/action";
import { CommonToaster } from "../../Common/CommonToaster";
import { getApprovalsApi } from "../../Api/action";
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
        loadPendingApprovals();
    }, []);

    useEffect(() => {
        const update = () => loadPendingApprovals();
        window.addEventListener("incomeExpenseUpdated", update);

        return () => window.removeEventListener("incomeExpenseUpdated", update);
    }, []);

    useEffect(() => {
        async function loadCategories() {
            const exp = await getExpenseCategoriesApi();
            const inc = await getIncomeCategoriesApi();

            const grouped = exp.reduce((acc, item) => {
                const main = item.main_category;
                const sub = item.sub_category;

                if (!acc[main]) acc[main] = [];
                acc[main].push(sub);

                return acc;
            }, {});

            setExpenseCategories(grouped);
            setIncomeCategories(inc.map(item => item.name));
        }

        loadCategories();
    }, []);


    const loadPendingApprovals = async () => {
        try {
            const data = await getApprovalsApi();
            setPendingCount(data?.length || 0);
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
        "/income-expense": "3",
        "/approvals": "4",
        "/wallet": "5",
        "/bills": "6",
        "/savings": "7",
        "/settings": "8",
        "/calendar": "9",
    };

    const selectedKey = menuKeyMap[location.pathname] || "1";

    const handleMenuClick = (e) => {
        const routeMap = {
            1: "/dashboard",
            2: "/categories",
            3: "/income-expense",
            4: "/approvals",
            5: "/wallet",
            6: "/bills",
            7: "/savings",
            8: "/settings",
            9: "/calendar",
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
                        CommonToaster("Your'e logged out!", 'error')
                        localStorage.removeItem("authToken");
                    } catch (e) {
                        console.error(e);
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
                    <div className="logo-circle"><img src="/images/cashmaster_logo_main.png" alt="" /></div>
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
                            { key: "3", icon: <DollarSign size={16} />, label: "Income / Expense" },

                            ...(isAdmin ? [
                                { key: "4", icon: <FileCheck2 size={16} />, label: "Approvals" },
                                { key: "5", icon: <Wallet size={16} />, label: "Wallet" },
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
                            { key: "2", icon: <PlusIcon size={16} />, label: "Add Category" },
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
                            <Tooltip title="Approvals pending">
                                <Button onClick={() => navigate("/approvals")} type="text" className="icon-btn notification-btn">
                                    <Bell size={18} />

                                    {pendingCount > 0 && (
                                        <span className="pending-badge">{pendingCount}</span>
                                    )}
                                </Button>
                            </Tooltip>
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

                {/* Main Content */}
                <Content className="main-content">
                    <Routes>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/add-record" element={<AddRecord />} />
                        <Route path="/categories" element={<AddCategories />} />
                        <Route path="/income-expense" element={<IncomeExpense />} />
                        <Route path="/approvals" element={<Approvals />} />
                        <Route path="/wallet" element={<WalletPage />} />
                        <Route path="/settings" element={<SettingPage />} />
                        <Route path="/calendar" element={<CalendarPage />} />
                    </Routes>
                </Content>
            </Layout>
        </Layout>
    );
}

