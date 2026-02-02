import React, { useEffect, useState } from "react";
import { createUserApi, getUsersApi, deleteUserApi, changeUserPasswordApi, safeGetLocalStorage, getVendorsApi, addVendorApi, updateVendorApi, deleteVendorApi } from "../../Api/action";
import { CommonToaster } from "../../Common/CommonToaster";
import { Input, Select, Button, Card, Popconfirm, Modal, Tabs } from "antd";

import { motion, AnimatePresence } from "framer-motion";
import SettingsSkeleton from "./SettingsSkeleton";
import { Building, Pencil } from "lucide-react";


export default function SettingPage() {
    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        role: "user",
    });

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // ✅ Password Change State
    const [isPassModalVisible, setIsPassModalVisible] = useState(false);
    const [passLoading, setPassLoading] = useState(false);
    const [passTargetId, setPassTargetId] = useState(null);
    const [newPassword, setNewPassword] = useState("");

    // ✅ Vendor State
    const [vendors, setVendors] = useState([]);
    const [isVendorModalVisible, setIsVendorModalVisible] = useState(false);
    const [vendorForm, setVendorForm] = useState({
        id: null,
        name: "",
        number: "",
        company_name: "",
        gst: "",
        email: "",
        address: ""
    });
    const [vendorSubmitting, setVendorSubmitting] = useState(false);

    // ✅ logged-in user
    const currentUser = safeGetLocalStorage("loginDetails", {});

    // ✅ Load all users
    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await getUsersApi();
            setUsers(data || []);
        } catch (err) {
            CommonToaster(err?.error || "Failed to load users", "error");
        } finally {
            setLoading(false);
        }
    };

    // ✅ Load all vendors
    const loadVendors = async () => {
        try {
            const data = await getVendorsApi();
            setVendors(data || []);
        } catch (err) {
            console.error("Failed to load vendors", err);
        }
    };

    useEffect(() => {
        loadUsers();
        if (currentUser?.role === "admin" || currentUser?.role === "superadmin") {
            loadVendors();
        }
    }, []);

    // ✅ Create User
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (currentUser?.role !== "admin" && currentUser?.role !== "superadmin") {
            return CommonToaster(
                "You do not have permission to create users",
                "error"
            );
        }

        try {
            setSubmitting(true);
            await createUserApi(form);
            CommonToaster("User created successfully!", "success");

            setForm({ name: "", email: "", password: "", role: "user" });
            await loadUsers();
        } catch (err) {
            CommonToaster(err?.error || "Unable to create user", "error");
        } finally {
            setSubmitting(false);
        }
    };

    // ✅ Delete User
    const handleDelete = async (id) => {
        if (currentUser?.role !== "admin" && currentUser?.role !== "superadmin") {
            return CommonToaster(
                "You do not have permission to delete users",
                "error"
            );
        }

        try {
            await deleteUserApi(id);
            CommonToaster("User deleted successfully", "success");
            setUsers((prev) => prev.filter((u) => u.id !== id));
        } catch (err) {
            CommonToaster(err?.error || "Failed to delete user", "error");
        }
    };

    // ✅ Change User Password
    const handlePasswordChange = async () => {
        if (!newPassword) {
            return CommonToaster("Please enter a new password", "error");
        }

        try {
            setPassLoading(true);
            await changeUserPasswordApi(passTargetId, newPassword);
            CommonToaster("Password updated successfully!", "success");
            setIsPassModalVisible(false);
            setNewPassword("");
        } catch (err) {
            CommonToaster(err?.error || "Failed to update password", "error");
        } finally {
            setPassLoading(false);
        }
    };

    // ✅ Handle Vendor Submit
    const handleVendorSubmit = async () => {
        if (!vendorForm.name) return CommonToaster("Vendor name is required", "error");

        try {
            setVendorSubmitting(true);
            if (vendorForm.id) {
                await updateVendorApi(vendorForm.id, vendorForm);
                CommonToaster("Vendor updated successfully!", "success");
            } else {
                await addVendorApi(vendorForm);
                CommonToaster("Vendor added successfully!", "success");
            }
            setIsVendorModalVisible(false);
            loadVendors();
        } catch (err) {
            CommonToaster(err?.message || "Operation failed", "error");
        } finally {
            setVendorSubmitting(false);
        }
    };

    const handleDeleteVendor = async (id) => {
        try {
            await deleteVendorApi(id);
            CommonToaster("Vendor deleted successfully", "success");
            loadVendors();
        } catch (err) {
            CommonToaster(err?.message || "Delete failed", "error");
        }
    };



    return (
        <div className="dashboard-container">
            {/* ✅ FULL SCREEN LOADER */}
            {loading ? (
                <SettingsSkeleton />
            ) : (
                <>
                    <motion.div
                        className="settings-page"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="expense-header">
                            <h1 className="header-title">Settings</h1>
                        </div>

                        <Tabs
                            defaultActiveKey="users"
                            className="custom-tabs"
                            items={[
                                {
                                    key: "users",
                                    label: "Users Management",
                                    children: (
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key="users-tab"
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                transition={{ duration: 0.3 }}
                                            >
                                                {/* ✅ CREATE USER FORM (Admin/Superadmin) */}
                                                {(currentUser?.role === "admin" || currentUser?.role === "superadmin") && (
                                                    <Card
                                                        className="card"
                                                        title={
                                                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                                <span>Create New User</span>
                                                            </div>
                                                        }
                                                        bordered={false}
                                                        style={{ marginBottom: 30 }}
                                                    >
                                                        <form onSubmit={handleSubmit} className="form-grid">
                                                            <div className="form-group">
                                                                <label>Full Name</label>
                                                                <Input
                                                                    value={form.name}
                                                                    placeholder="Enter name"
                                                                    className="category-input"
                                                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                                                />
                                                            </div>
                                                            <div className="form-group">
                                                                <label>Email Address</label>
                                                                <Input
                                                                    value={form.email}
                                                                    placeholder="email@example.com"
                                                                    className="category-input"
                                                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                                                />
                                                            </div>
                                                            <div className="form-group">
                                                                <label>Account Password</label>
                                                                <Input.Password
                                                                    value={form.password}
                                                                    placeholder="Enter password"
                                                                    className="category-input"
                                                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                                                />
                                                            </div>
                                                            <div className="form-group">
                                                                <label>System Role</label>
                                                                <Select
                                                                    value={form.role}
                                                                    onChange={(value) => setForm({ ...form, role: value })}
                                                                    style={{ width: "100%" }}
                                                                    dropdownStyle={{ borderRadius: '8px' }}
                                                                    options={[
                                                                        { label: "User (Staff)", value: "user" },
                                                                        { label: "Administrator", value: "admin" },
                                                                        { label: "Super Administrator", value: "superadmin" },
                                                                    ]}
                                                                />
                                                            </div>
                                                            <div style={{ gridColumn: "span 2", textAlign: "right", marginTop: 10 }}>
                                                                <Button
                                                                    type="primary"
                                                                    htmlType="submit"
                                                                    className="btn-primary add-user-btn"
                                                                    loading={submitting}
                                                                    style={{ height: '45px', padding: '0 30px' }}
                                                                >
                                                                    Add User Account
                                                                </Button>
                                                            </div>
                                                        </form>
                                                    </Card>
                                                )}

                                                {/* ✅ USERS LIST */}
                                                <Card
                                                    className="card"
                                                    title={
                                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                            <span>System Users</span>
                                                        </div>
                                                    }
                                                    bordered={false}
                                                >
                                                    <div className="table-wrapper">
                                                        <table className="transactions-table">
                                                            <thead>
                                                                <tr>
                                                                    <th>S.no</th>
                                                                    <th>Name</th>
                                                                    <th>Email</th>
                                                                    <th>Role</th>
                                                                    <th>Created</th>
                                                                    <th>Actions</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {users.length === 0 ? (
                                                                    <tr>
                                                                        <td colSpan="6" className="no-data" style={{ textAlign: 'center', padding: '40px' }}>
                                                                            No users found in the system.
                                                                        </td>
                                                                    </tr>
                                                                ) : (
                                                                    users.map((u, idx) => (
                                                                        <tr key={u.id}>
                                                                            <td>{idx + 1}</td>
                                                                            <td style={{ fontWeight: 600 }}>{u.name}</td>
                                                                            <td>{u.email}</td>
                                                                            <td>
                                                                                <span className={`status-pill ${u.role === 'admin' || u.role === 'superadmin' ? 'positive' : 'neutral'}`} style={{ textTransform: 'capitalize' }}>
                                                                                    {u.role === 'superadmin' ? 'Super Admin' : u.role}
                                                                                </span>
                                                                            </td>
                                                                            <td>{new Date(u.created_at).toLocaleDateString()}</td>
                                                                            <td>
                                                                                {currentUser?.role !== "admin" && currentUser.role !== "superadmin" ? (
                                                                                    <span style={{ color: '#999', fontSize: '12px' }}>Locked</span>
                                                                                ) : (u.role === "admin" || u.role === "superadmin") && currentUser.role === "admin" && Number(u.id) !== Number(currentUser.id) ? (
                                                                                    <span style={{ color: '#999', fontSize: '13px' }}>{u.role === 'superadmin' ? 'Protected Super Admin' : 'Protected Admin'}</span>
                                                                                ) : (
                                                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                                                        <Button
                                                                                            size="small"
                                                                                            style={{ borderColor: '#d4af37', color: '#d4af37' }}
                                                                                            onClick={() => {
                                                                                                setPassTargetId(u.id);
                                                                                                setIsPassModalVisible(true);
                                                                                            }}
                                                                                        >
                                                                                            Password
                                                                                        </Button>
                                                                                        {Number(u.id) !== Number(currentUser.id) && (
                                                                                            <Popconfirm
                                                                                                title="Delete User"
                                                                                                description="Are you sure you want to delete this user?"
                                                                                                onConfirm={() => handleDelete(u.id)}
                                                                                                okButtonProps={{ danger: true }}
                                                                                            >
                                                                                                <Button danger size="small">Delete</Button>
                                                                                            </Popconfirm>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                    ))
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </Card>
                                            </motion.div>
                                        </AnimatePresence>
                                    )
                                },
                                (currentUser?.role === "admin" || currentUser?.role === "superadmin") && {
                                    key: "vendors",
                                    label: "Vendor Management",
                                    children: (
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key="vendors-tab"
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                transition={{ duration: 0.3 }}
                                            >
                                                <Card
                                                    className="card add-vendor-card"
                                                    title={
                                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                            <span>Vendor Registration</span>
                                                        </div>
                                                    }
                                                    bordered={false}
                                                    extra={
                                                        <Button
                                                            type="primary"
                                                            className="btn-primary add-vendor-btn"
                                                            onClick={() => {
                                                                setVendorForm({ id: null, name: "", number: "", company_name: "", gst: "", email: "", address: "" });
                                                                setIsVendorModalVisible(true);
                                                            }}
                                                        >
                                                            + Add Vendor
                                                        </Button>
                                                    }
                                                >
                                                    <div className="table-wrapper">
                                                        <table className="transactions-table">
                                                            <thead>
                                                                <tr>
                                                                    <th>S.no</th>
                                                                    <th>Vendor Name</th>
                                                                    <th>Company Details</th>
                                                                    <th>GST / Tax ID</th>
                                                                    <th>Contact Info</th>
                                                                    <th>Actions</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {vendors.length === 0 ? (
                                                                    <tr>
                                                                        <td colSpan="6" className="no-data" style={{ textAlign: 'center', padding: '40px' }}>
                                                                            No vendors registered.
                                                                        </td>
                                                                    </tr>
                                                                ) : (
                                                                    vendors.map((v, idx) => (
                                                                        <tr key={v.id}>
                                                                            <td>{idx + 1}</td>
                                                                            <td style={{ fontWeight: 600 }}>{v.name}</td>
                                                                            <td>
                                                                                <div style={{ fontSize: '13px' }}>{v.company_name}</div>
                                                                                <div style={{ fontSize: '11px', color: '#666' }}>{v.address}</div>
                                                                            </td>
                                                                            <td>{v.gst || "N/A"}</td>
                                                                            <td>
                                                                                <div>{v.number}</div>
                                                                                <div style={{ fontSize: '12px', color: '#d4af37' }}>{v.email}</div>
                                                                            </td>
                                                                            <td>
                                                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                                                    <Button
                                                                                        size="small"
                                                                                        onClick={() => {
                                                                                            setVendorForm(v);
                                                                                            setIsVendorModalVisible(true);
                                                                                        }}
                                                                                    >
                                                                                        Edit
                                                                                    </Button>
                                                                                    <Popconfirm
                                                                                        title="Delete Vendor"
                                                                                        description="All data for this vendor will be removed. Continue?"
                                                                                        onConfirm={() => handleDeleteVendor(v.id)}
                                                                                        okButtonProps={{ danger: true }}
                                                                                    >
                                                                                        <Button danger size="small">Delete</Button>
                                                                                    </Popconfirm>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    ))
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </Card>
                                            </motion.div>
                                        </AnimatePresence>
                                    )
                                }
                            ].filter(Boolean)}
                        />
                    </motion.div>

                    {/* ✅ PASSWORD CHANGE MODAL */}
                    <Modal
                        title={<span style={{ color: '#1c2431', fontWeight: 700 }}>🔐 Change User Password</span>}
                        open={isPassModalVisible}
                        onOk={handlePasswordChange}
                        onCancel={() => {
                            setIsPassModalVisible(false);
                            setNewPassword("");
                        }}
                        confirmLoading={passLoading}
                        okText="Update Password"
                        okButtonProps={{ className: 'btn-primary', style: { border: 'none' } }}
                    >
                        <div style={{ padding: '20px 0' }}>
                            <label style={{ display: "block", marginBottom: 10, fontWeight: 600, color: '#555' }}>Enter New Security Password</label>
                            <Input.Password
                                value={newPassword}
                                placeholder="Min 6 characters recommended"
                                className="category-input"
                                style={{ height: '45px' }}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                        </div>
                    </Modal>

                    {/* ✅ VENDOR ADD/EDIT MODAL */}
                    <Modal
                        title={
                            <span style={{ color: '#1c2431', fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
                                {vendorForm.id ? <><Pencil size={16} />Edit Vendor Profile</> : <><Pencil size={16} />Register New Vendor</>}
                            </span>
                        }
                        open={isVendorModalVisible}
                        onOk={handleVendorSubmit}
                        onCancel={() => setIsVendorModalVisible(false)}
                        confirmLoading={vendorSubmitting}
                        width={650}
                        okText={vendorForm.id ? "Save Changes" : "Register Vendor"}
                        okButtonProps={{ className: 'btn-primary', style: { border: 'none' } }}
                    >
                        <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "20px", padding: '10px 0' }}>
                            <div className="form-group">
                                <label style={{ fontWeight: 600 }}>Vendor Display Name</label>
                                <Input
                                    value={vendorForm.name}
                                    className="category-input"
                                    placeholder="e.g. John Doe"
                                    onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ fontWeight: 600 }}>Company Legal Name</label>
                                <Input
                                    value={vendorForm.company_name}
                                    className="category-input"
                                    placeholder="e.g. Acme Corp"
                                    onChange={(e) => setVendorForm({ ...vendorForm, company_name: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ fontWeight: 600 }}>GST / Tax Number</label>
                                <Input
                                    value={vendorForm.gst}
                                    className="category-input"
                                    placeholder="GSTIN Number"
                                    onChange={(e) => setVendorForm({ ...vendorForm, gst: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ fontWeight: 600 }}>Contact Number</label>
                                <Input
                                    value={vendorForm.number}
                                    className="category-input"
                                    placeholder="+91 XXXXX XXXXX"
                                    onChange={(e) => setVendorForm({ ...vendorForm, number: e.target.value })}
                                />
                            </div>
                            <div className="form-group" style={{ gridColumn: "span 2" }}>
                                <label style={{ fontWeight: 600 }}>Email Address</label>
                                <Input
                                    value={vendorForm.email}
                                    className="category-input"
                                    placeholder="vendor@example.com"
                                    onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                                />
                            </div>
                            <div className="form-group" style={{ gridColumn: "span 2" }}>
                                <label style={{ fontWeight: 600 }}>Business Address</label>
                                <Input.TextArea
                                    value={vendorForm.address}
                                    className="category-input"
                                    rows={3}
                                    placeholder="Full street address..."
                                    style={{ resize: 'none' }}
                                    onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
                                />
                            </div>
                        </div>
                    </Modal>
                </>
            )
            }
        </div >
    );
}
