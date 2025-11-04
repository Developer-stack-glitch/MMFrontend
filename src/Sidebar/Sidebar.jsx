import React, { useEffect, useState } from "react";
import {
    Layout,
    Menu,
    Button,
    Avatar,
    Dropdown,
    Modal,
    Tooltip,
} from "antd";
import {
    Menu as MenuIcon,
    X,
    LayoutDashboard,
    DollarSign,
    FileCheck2,
    Heart,
    Settings,
    HelpCircle,
    Bell,
    LogOut,
    Plus,
} from "lucide-react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import "../css/Sidebar.css";
import Dashboard from "../Dashboard/Dashboard";
import AddRecord from "../Dashboard/AddRecord";
import AddCategories from "../Dashboard/AddCategeories";
import IncomeExpense from "../Dashboard/IncomeExpense";
import Approvals from "../Dashboard/Approvals";
import { apiLogout, getUser } from "../../Api/action";
import { CommonToaster } from "../../Common/CommonToaster";
import { getApprovalsApi } from "../../Api/action";
import SettingPage from "../Dashboard/Settings";
const { Sider, Content, Header } = Layout;

export default function SideBarLayout() {
    const [collapsed, setCollapsed] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState("");
    const [pendingCount, setPendingCount] = useState(0);

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
        "/add-record": "2",
        "/income-expense": "3",
        "/approvals": "4",
        "/budgets": "5",
        "/bills": "6",
        "/savings": "7",
        "/settings": "8",
        "/help": "9",
    };

    const selectedKey = menuKeyMap[location.pathname] || "1";

    const handleMenuClick = (e) => {
        const routeMap = {
            1: "/dashboard",
            2: "/add-record",
            3: "/income-expense",
            4: "/approvals",
            5: "/budgets",
            6: "/bills",
            7: "/savings",
            8: "/settings",
            9: "/help",
        };
        navigate(routeMap[e.key]);
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
            {/* Add New Category Button */}
            <Button
                className="new-category"
                onClick={() => setIsCategoryModalOpen(true)}
            >
                <Plus size={20} /> Add New Category
            </Button>

            {/* Add Category Modal */}
            <Modal
                open={isCategoryModalOpen}
                onCancel={() => setIsCategoryModalOpen(false)}
                footer={null}
                width={600}
                centered
                closeIcon={<X size={22} />}
                className="category-main-modal"
            >
                <AddCategories />
            </Modal>

            {/* Sidebar */}
            <Sider
                trigger={null}
                collapsible
                collapsed={collapsed}
                width={240}
                className={`premium-sider ${collapsed ? "collapsed" : ""}`}
            >
                <div className="sider-header">
                    <div className="logo-circle">💸</div>
                    {!collapsed && <h2 className="logo-text">FinancePro</h2>}
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
                            { key: "2", icon: <Plus size={16} />, label: "Add Record" },
                            { key: "3", icon: <DollarSign size={16} />, label: "Income / Expense" },
                            { key: "4", icon: <FileCheck2 size={16} />, label: "Approvals" },
                            { key: "6", icon: <Heart size={16} />, label: "Savings" },
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
                            { key: "9", icon: <HelpCircle size={16} />, label: "Help Center" },
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
                    <h2 className="header-title">Hello, {user.name}</h2>
                    <div className="header-right">
                        <Tooltip title="Approvals pending">
                            <Button onClick={() => navigate("/approvals")} type="text" className="icon-btn notification-btn">
                                <Bell size={18} />

                                {pendingCount > 0 && (
                                    <span className="pending-badge">{pendingCount}</span>
                                )}
                            </Button>
                        </Tooltip>
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
                        <Route path="/income-expense" element={<IncomeExpense />} />
                        <Route path="/approvals" element={<Approvals />} />
                        <Route path="/settings" element={<SettingPage />} />
                    </Routes>
                </Content>
            </Layout>
        </Layout>
    );
}

