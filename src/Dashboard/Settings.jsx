import React, { useEffect, useState } from "react";
import { createUserApi, getUsersApi, deleteUserApi } from "../../Api/action";
import { CommonToaster } from "../../Common/CommonToaster";
import { Input, Select, Button, Card, Popconfirm } from "antd";
import { FullPageLoader } from "../../Common/FullPageLoader";
import { motion } from "framer-motion";

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

    // ✅ logged-in user
    const currentUser = JSON.parse(localStorage.getItem("loginDetails"));

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

    useEffect(() => {
        loadUsers();
    }, []);

    // ✅ Create User
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (currentUser?.role !== "admin") {
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
        if (currentUser?.role !== "admin") {
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

    const fadeUp = {
        hidden: { opacity: 0, y: 30 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.6 },
        },
    };

    return (
        <>
            {/* ✅ FULL SCREEN LOADER */}
            {loading ? (<FullPageLoader />) : (
                <>
                    <div className="settings-page">

                        {/* ✅ CREATE USER FORM (Admin Only) */}
                        <motion.div variants={fadeUp}
                            initial="hidden"
                            animate="visible">
                            {currentUser?.role === "admin" && (
                                <Card className="card" title="Create User" bordered={false} style={{ marginBottom: 30 }}>
                                    <form onSubmit={handleSubmit} className="form-grid">

                                        <div className="form-group">
                                            <label>Name</label>
                                            <Input
                                                value={form.name}
                                                placeholder="Enter name"
                                                onChange={(e) =>
                                                    setForm({ ...form, name: e.target.value })
                                                }
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Email</label>
                                            <Input
                                                value={form.email}
                                                placeholder="email@example.com"
                                                onChange={(e) =>
                                                    setForm({ ...form, email: e.target.value })
                                                }
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Password</label>
                                            <Input.Password
                                                value={form.password}
                                                placeholder="Enter password"
                                                onChange={(e) =>
                                                    setForm({ ...form, password: e.target.value })
                                                }
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Role</label>
                                            <Select
                                                value={form.role}
                                                onChange={(value) => setForm({ ...form, role: value })}
                                                style={{ width: "100%" }}
                                                options={[
                                                    { label: "User", value: "user" },
                                                    { label: "Admin", value: "admin" },
                                                ]}
                                            />
                                        </div>

                                        <Button
                                            type="primary"
                                            htmlType="submit"
                                            className="create-btns"
                                            loading={submitting}
                                            style={{ marginTop: 10 }}
                                        >
                                            Create User
                                        </Button>
                                    </form>
                                </Card>
                            )}
                        </motion.div>


                        {/* ✅ USERS LIST */}
                        <motion.div variants={fadeUp}
                            initial="hidden"
                            animate="visible">
                            <Card className="card" title="Users List" bordered={false}>
                                <div className="table-wrapper">
                                    <table className="styled-table">
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
                                            {!loading && users.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6" className="no-data">
                                                        No Users Found
                                                    </td>
                                                </tr>
                                            ) : (
                                                !loading &&
                                                users.map((u, idx) => (
                                                    <tr key={u.id}>
                                                        <td>{idx + 1}</td>
                                                        <td>{u.name}</td>
                                                        <td>{u.email}</td>
                                                        <td>
                                                            <span className={`role-badge ${u.role}`}>
                                                                {u.role}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {new Date(u.created_at).toLocaleString()}
                                                        </td>

                                                        <td>
                                                            {/* ✅ NON-ADMIN CANNOT DELETE */}
                                                            {currentUser?.role !== "admin" ? (
                                                                <Button
                                                                    size="small"
                                                                    className="delete-btn disabled-btn"
                                                                    disabled
                                                                >
                                                                    No Access
                                                                </Button>
                                                            ) : u.role === "admin" ? (
                                                                // ✅ Prevent deleting admin accounts
                                                                <Button
                                                                    size="small"
                                                                    className="delete-btn disabled-btn"
                                                                    disabled
                                                                >
                                                                    Protected
                                                                </Button>
                                                            ) : (
                                                                <Popconfirm
                                                                    title="Delete User"
                                                                    description="Are you sure you want to delete this user?"
                                                                    okText="Yes"
                                                                    cancelText="No"
                                                                    onConfirm={() => handleDelete(u.id)}
                                                                >
                                                                    <Button danger size="small" className="delete-btn">
                                                                        Delete
                                                                    </Button>
                                                                </Popconfirm>
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

                    </div>
                </>
            )}
        </>
    );
}
