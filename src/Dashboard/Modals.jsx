import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Upload } from "lucide-react";
import { Dropdown, Menu, Button, Space, DatePicker } from "antd";
import { addExpenseApi, addIncomeApi, editExpenseApi } from "../../Api/action";
import { DownOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { CommonToaster } from "../../Common/CommonToaster";
import { getLastMonthSummaryApi } from "../../Api/action";

export default function Modals({
    open,
    type,
    isEdit = false,
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
    vendorName,
    setVendorName,
    vendorNumber,
    setVendorNumber,
    endDate,
    setEndDate,
    editData,
}) {
    if (!open) return null;

    const [invoices, setInvoices] = useState([]);
    const [spendMode, setSpendMode] = useState("Select Spend Mode");

    const currentUser = JSON.parse(localStorage.getItem("loginDetails"));

    useEffect(() => {
        // When opening modal for edit, hydrate local invoice + spendMode
        if (open && isEdit && editData) {
            if (Array.isArray(editData.invoice)) {
                setInvoices(editData.invoice);
            } else if (typeof editData.invoice === "string" && editData.invoice.trim()) {
                if (editData.invoice.trim().startsWith("[")) {
                    try {
                        const parsed = JSON.parse(editData.invoice);
                        if (Array.isArray(parsed)) setInvoices(parsed);
                    } catch {
                        setInvoices([editData.invoice]);
                    }
                } else {
                    setInvoices([editData.invoice]);
                }
            } else {
                setInvoices([]);
            }

            // spend mode
            setSpendMode(editData.spend_mode || "Select Spend Mode");

            // Vendor & End Date
            setVendorName(editData.vendor_name || "");
            setVendorNumber(editData.vendor_number || "");
            setEndDate(editData.end_date || null);
        }

        if (open && !isEdit) {
            setInvoices([]);
            setSpendMode("Select Spend Mode");
            setVendorName("");
            setVendorNumber("");
            setEndDate(null);
        }
    }, [open, isEdit, editData]);

    const handleDateChange = (v) => {
        const d = v ? v.format("YYYY-MM-DD") : null;
        setDate(d);
    };

    const handleEndDateChange = (v) => {
        const d = v ? v.format("YYYY-MM-DD") : null;
        setEndDate(d);
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        const totalSize = files.reduce((acc, file) => acc + file.size, 0);
        if (totalSize > 5 * 1024 * 1024) {
            CommonToaster("Total file size must be less than 5MB", "error");
            return;
        }

        const filePromises = files.map((file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        });

        Promise.all(filePromises)
            .then((base64Files) => {
                setInvoices((prev) => [...prev, ...base64Files]);
            })
            .catch(() => {
                CommonToaster("Error reading files", "error");
            });
    };

    const removeInvoice = (index) => {
        setInvoices((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (branch === "Select Branch") return CommonToaster("Select branch", "error");
        if (!date) return CommonToaster("Select date", "error");
        if (!total) return CommonToaster("Enter total amount", "error");
        if (mainCategory === "Select Main Category") return CommonToaster("Select main category", "error");

        if (type === "expense" && subCategory === "Select Category")
            return CommonToaster("Select sub category", "error");

        if (type === "expense" && spendMode === "Select Spend Mode")
            return CommonToaster("Select spend mode", "error");

        const payloadBase = {
            branch,
            date,
            total,
            mainCategory,
            subCategory: type === "expense" ? subCategory : "",
            description: description || "",
            vendor_name: vendorName || "",
            vendor_number: vendorNumber || "",
            end_date: endDate || "",
            invoices: invoices.length > 0 ? invoices : [],
            spend_mode: type === "expense" ? spendMode : ""
        };

        try {
            if (type === "expense" && isEdit && editData) {
                // EDIT EXPENSE FLOW
                const updates = {
                    total,
                    branch,
                    date,
                    mainCategory,
                    subCategory,
                    description,
                    invoices,
                    vendor_name: vendorName,
                    vendor_number: vendorNumber,
                    end_date: endDate,
                    spend_mode: spendMode
                };

                const res = await editExpenseApi({
                    expense_id: editData.id,
                    user_id: currentUser?.id,
                    updates
                });

                CommonToaster(res.data?.message || "Expense updated!", "success");
            } else if (type === "expense") {
                // ADD EXPENSE FLOW
                await addExpenseApi({
                    user_id: currentUser?.id,
                    ...payloadBase
                });

                CommonToaster(
                    currentUser?.role === "admin"
                        ? "Expense added & auto-approved!"
                        : "Expense submitted!",
                    "success"
                );
            } else {
                // ADD INCOME FLOW
                await addIncomeApi({
                    user_id: currentUser?.id,
                    ...payloadBase
                });
                CommonToaster("Income added successfully!", "success");
            }

            // Reset local-only state
            setInvoices([]);
            setSpendMode("Select Spend Mode");

            onClose();

            setTimeout(() => {
                window.dispatchEvent(new Event("summaryUpdated"));
            }, 50);
            setTimeout(() => {
                window.dispatchEvent(new Event("incomeExpenseUpdated"));
            }, 50);
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

    const isExpense = type === "expense";

    return (
        <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="expense-modal"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* HEADER */}
                <div className="modal-header">
                    <h2>
                        {isExpense
                            ? isEdit
                                ? "Edit Expense"
                                : "New Expense"
                            : "New Income"}
                    </h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* HIDE TABS IN EDIT MODE */}
                {!isEdit && (
                    <div style={{ display: "flex", gap: 10, marginTop: 10, marginBottom: 15 }}>
                        {currentUser?.role === "admin" ? (
                            <>
                                <button
                                    onClick={() => {
                                        onClose();
                                        setTimeout(() => {
                                            window.dispatchEvent(new CustomEvent("openIncomeModal"));
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
                                            window.dispatchEvent(new CustomEvent("openExpenseModal"));
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
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => {
                                        onClose();
                                        setTimeout(() => {
                                            window.dispatchEvent(new CustomEvent("openExpenseModal"));
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
                            </>
                        )}
                    </div>
                )}
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

                        {isExpense && (
                            <>
                                <label>End Date <span style={{ color: "red" }}>*</span></label>
                                <DatePicker
                                    value={endDate ? dayjs(endDate) : null}
                                    onChange={handleEndDateChange}
                                    style={{ width: "100%", height: 40 }}
                                />
                            </>
                        )}

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
                        {isExpense && (
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
                        {!isExpense && (
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

                        {isExpense && (
                            <>
                                <label>Vendor Name</label>
                                <input
                                    type="text"
                                    value={vendorName}
                                    onChange={(e) => setVendorName(e.target.value)}
                                    placeholder="Add Vendor name"
                                    style={{ height: 40 }}
                                />

                                <label>Vendor Number</label>
                                <input
                                    type="text"
                                    value={vendorNumber}
                                    onChange={(e) => setVendorNumber(e.target.value)}
                                    placeholder="Add Vendor number"
                                    style={{ height: 40 }}
                                />

                                <label>Spend Mode <span style={{ color: "red" }}>*</span></label>
                                <Dropdown
                                    overlay={
                                        <Menu
                                            onClick={(e) => setSpendMode(e.key)}
                                            items={[
                                                { key: "Cash", label: "Cash" },
                                                { key: "Online", label: "Online" },
                                            ]}
                                        />
                                    }
                                    trigger={["click"]}
                                >
                                    <Button style={{ width: "100%", height: 40 }}>
                                        <Space>{spendMode}<DownOutlined /></Space>
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
                            <p>Upload invoices (Multiple files allowed)</p>

                            <input
                                type="file"
                                accept="image/*,application/pdf"
                                multiple
                                onChange={handleFileChange}
                                style={{
                                    marginTop: 10,
                                    position: "absolute",
                                    height: "100%",
                                    opacity: 0,
                                    cursor: "pointer"
                                }}
                            />
                        </div>

                        {invoices.length > 0 && (
                            <div style={{ marginTop: 15 }}>
                                <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
                                    Selected Invoices ({invoices.length})
                                </p>
                                <div style={{
                                    display: "flex",
                                    gap: 10,
                                    flexWrap: "wrap",
                                    maxHeight: 200,
                                    overflowY: "auto"
                                }}>
                                    {invoices.map((inv, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                position: "relative",
                                                width: 80,
                                                height: 80,
                                                borderRadius: 8,
                                                overflow: "hidden",
                                                border: "2px solid #e0e0e0"
                                            }}
                                        >
                                            {typeof inv === "string" && inv.includes("application/pdf") ? (
                                                <div style={{
                                                    width: "100%",
                                                    height: "100%",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    background: "#f5f5f5",
                                                    fontSize: 10,
                                                    fontWeight: 600,
                                                    color: "#666"
                                                }}>
                                                    PDF
                                                </div>
                                            ) : (
                                                <img
                                                    src={inv}
                                                    alt={`invoice-${idx}`}
                                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                                />
                                            )}
                                            <button
                                                onClick={() => removeInvoice(idx)}
                                                style={{
                                                    position: "absolute",
                                                    top: 2,
                                                    right: 2,
                                                    background: "rgba(255, 0, 0, 0.8)",
                                                    border: "none",
                                                    borderRadius: "50%",
                                                    width: 20,
                                                    height: 20,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    cursor: "pointer",
                                                    padding: 0
                                                }}
                                            >
                                                <X size={14} color="white" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* FOOTER */}
                <div className="modal-footer">
                    <button className="btn-draft" onClick={handleSubmit}>
                        {isExpense && isEdit
                            ? "Update Expense"
                            : `Add ${isExpense ? "Expense" : "Income"}`}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
