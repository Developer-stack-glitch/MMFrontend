import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, Upload } from "lucide-react";
import { Dropdown, Menu, Button, Space, DatePicker } from "antd";
import { addExpenseApi, addIncomeApi } from "../../Api/action";
import { DownOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { CommonToaster } from "../../Common/CommonToaster";
import { getLastMonthSummaryApi } from "../../Api/action";

export default function Modals({
    open,
    type,
    onClose,
    branch,
    setBranch,
    date,
    setDate,
    total,
    setTotal,
    mainCategory,
    setMainCategory,
    subCategory,
    setSubCategory,
    description,
    setDescription,
    expenseCategories,
    incomeCategories,
    setOpenModal,
}) {
    if (!open) return null;

    const [invoice, setInvoice] = useState(null);

    const handleDateChange = async (v) => {
        const d = v ? v.format("YYYY-MM-DD") : null;
        setDate(d);
        if (d) await getLastMonthSummaryApi(d);
    };

    const handleSubmit = async () => {
        if (branch === "Select Branch") return CommonToaster("Select branch", "error");
        if (!date) return CommonToaster("Select date", "error");
        if (!total) return CommonToaster("Enter total amount", "error");
        if (mainCategory === "Select Main Category") return CommonToaster("Select main category", "error");

        if (type === "expense" && subCategory === "Select Category")
            return CommonToaster("Select sub category", "error");

        const currentUser = JSON.parse(localStorage.getItem("loginDetails"));

        const formData = new FormData();
        formData.append("user_id", currentUser?.id);
        formData.append("branch", branch);
        formData.append("date", date);
        formData.append("total", total);
        formData.append("mainCategory", mainCategory);
        formData.append("subCategory", type === "expense" ? subCategory : "");
        formData.append("description", description || "");

        if (invoice) {
            formData.append("invoice", invoice);
        }

        try {
            if (type === "expense") {
                await addExpenseApi(formData);
                CommonToaster(
                    currentUser?.role === "admin"
                        ? "Expense added & auto-approved!"
                        : "Expense submitted!",
                    "success"
                );
            } else {
                await addIncomeApi(formData);
                CommonToaster("Income added successfully!", "success");
            }

            setBranch("Select Branch");
            setDate(dayjs().format("YYYY-MM-DD"));
            setTotal("");
            setMainCategory("Select Main Category");
            setSubCategory("Select Category");
            setDescription("");
            setInvoice(null);

            onClose();

            window.dispatchEvent(new Event("summaryUpdated"));
            window.dispatchEvent(new Event("incomeExpenseUpdated"));
        } catch (err) {
            CommonToaster(err?.message || "Server Error", "error");
        }
    };

    const branchMenu = (
        <Menu
            onClick={(e) => setBranch(e.key)}
            items={[
                { key: "Velachery", label: "Velachery" },
                { key: "Anna Nagar", label: "Anna Nagar" },
                { key: "Tambaram", label: "Tambaram" },
                { key: "Porur", label: "Porur" },
                { key: "Tnagar", label: "Tnagar" },
                { key: "OMR", label: "OMR" },
                { key: "Siruseri", label: "Siruseri" },
                { key: "Thiruvanmiyur", label: "Thiruvanmiyur" },
                { key: "Maraimalai Nagar", label: "Maraimalai Nagar" },
                { key: "Electronic City", label: "Electronic City" },
                { key: "BTM Layout", label: "BTM Layout" },
                { key: "Marathahalli", label: "Marathahalli" },
                { key: "Hebbal", label: "Hebbal" },
                { key: "Rajaji Nagar", label: "Rajaji Nagar" },
                { key: "Jayanagar", label: "Jayanagar" },
                { key: "Kalyan Nagar", label: "Kalyan Nagar" },
                { key: "Indira Nagar", label: "Indira Nagar" },
                { key: "HSR Layout", label: "HSR Layout" },
            ]}
        />
    );

    return (
        <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="expense-modal" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>

                {/* HEADER */}
                <div className="modal-header">
                    <h2>New {type === "expense" ? "Expense" : "Income"}</h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 10, marginBottom: 15 }}>
                    <button
                        onClick={() => {
                            onClose();
                            setTimeout(() => {
                                const event = new CustomEvent("openIncomeModal");
                                window.dispatchEvent(event);
                            }, 50);
                        }}
                        style={{
                            padding: "8px 14px",
                            borderRadius: 8,
                            border: type === "income" ? "none" : "1px solid #ccc",
                            background: type === "income" ? "#d4af37" : "#f1f1f1",
                            color: type === "income" ? "white" : "black",
                            cursor: "pointer",
                            fontWeight: 600,
                        }}
                    >
                        Income
                    </button>

                    <button
                        onClick={() => {
                            onClose();
                            setTimeout(() => {
                                const event = new CustomEvent("openExpenseModal");
                                window.dispatchEvent(event);
                            }, 50);
                        }}
                        style={{
                            padding: "8px 14px",
                            borderRadius: 8,
                            border: type === "expense" ? "none" : "1px solid #ccc",
                            background: type === "expense" ? "#d4af37" : "#f1f1f1",
                            color: type === "expense" ? "white" : "black",
                            cursor: "pointer",
                            fontWeight: 600,
                        }}
                    >
                        Expense
                    </button>
                </div>

                <hr />

                {/* BODY */}
                <div className="modal-body">

                    <div className="form-section">

                        {/* Branch */}
                        <label>Branch <span style={{ color: "red" }}>*</span></label>
                        <Dropdown overlay={branchMenu} trigger={["click"]}>
                            <Button style={{ width: "100%", height: 40 }}>
                                <Space>
                                    {branch}
                                    <DownOutlined />
                                </Space>
                            </Button>
                        </Dropdown>

                        {/* Date */}
                        <label>Date <span style={{ color: "red" }}>*</span></label>
                        <DatePicker
                            value={date ? dayjs(date) : null}
                            onChange={handleDateChange}
                            style={{ width: "100%", height: 40 }}
                        />

                        {/* Total */}
                        <label>Total <span style={{ color: "red" }}>*</span></label>
                        <input
                            type="number"
                            value={total}
                            onChange={(e) => setTotal(e.target.value)}
                            placeholder="0.00"
                            style={{ height: 40 }}
                        />

                        {/* EXPENSE CATEGORIES */}
                        {type === "expense" && (
                            <>
                                <label>Main Category <span style={{ color: "red" }}>*</span></label>
                                <Dropdown
                                    overlay={
                                        <Menu
                                            onClick={(e) => {
                                                setMainCategory(e.key);
                                                setSubCategory("Select Category");
                                            }}
                                            items={Object.keys(expenseCategories).map((cat) => ({
                                                key: cat,
                                                label: cat,
                                            }))}
                                        />
                                    }
                                    trigger={["click"]}
                                >
                                    <Button style={{ width: "100%", height: 40 }}>
                                        <Space>{mainCategory}<DownOutlined /></Space>
                                    </Button>
                                </Dropdown>

                                {mainCategory !== "Select Main Category" && (
                                    <>
                                        <label>Sub Category <span style={{ color: "red" }}>*</span></label>
                                        <Dropdown
                                            overlay={
                                                <Menu
                                                    onClick={(e) => setSubCategory(e.key)}
                                                    items={
                                                        Array.isArray(expenseCategories[mainCategory])
                                                            ? expenseCategories[mainCategory].map((sub) => ({
                                                                key: sub,
                                                                label: sub,
                                                            }))
                                                            : []
                                                    }
                                                />
                                            }
                                            trigger={["click"]}
                                        >
                                            <Button style={{ width: "100%", height: 40 }}>
                                                <Space>{subCategory}<DownOutlined /></Space>
                                            </Button>
                                        </Dropdown>
                                    </>
                                )}
                            </>
                        )}

                        {/* INCOME CATEGORIES */}
                        {type === "income" && (
                            <>
                                <label>Income Category <span style={{ color: "red" }}>*</span></label>
                                <Dropdown
                                    overlay={
                                        <Menu
                                            onClick={(e) => setMainCategory(e.key)}
                                            items={incomeCategories.map((cat) => ({
                                                key: cat,
                                                label: cat,
                                            }))}
                                        />
                                    }
                                    trigger={["click"]}
                                >
                                    <Button style={{ width: "100%", height: 40 }}>
                                        <Space>{mainCategory}<DownOutlined /></Space>
                                    </Button>
                                </Dropdown>
                            </>
                        )}

                        {/* Description */}
                        <label>Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add a description..."
                        />
                    </div>

                    {/* UPLOAD */}
                    <div className="upload-section">
                        <div className="upload-box">
                            <Upload size={40} strokeWidth={1.5} />
                            <p>Upload an invoice</p>

                            <input
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={(e) => setInvoice(e.target.files[0])}
                                style={{
                                    marginTop: 10,
                                    position: "absolute",
                                    height: "100%",
                                    opacity: 0,
                                    cursor: "pointer"
                                }}
                            />
                        </div>

                        {invoice && (
                            <p style={{ marginTop: 10, fontSize: 13, color: "#444", textAlign: "center" }}>
                                <strong>Selected:</strong> {invoice.name}
                            </p>
                        )}
                    </div>
                </div>

                {/* FOOTER */}
                <div className="modal-footer">
                    <button className="btn-draft" onClick={handleSubmit}>
                        Add {type === "expense" ? "Expense" : "Income"}
                    </button>
                </div>

            </motion.div>
        </motion.div>
    );
}
