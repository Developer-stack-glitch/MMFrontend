import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, Upload } from "lucide-react";
import { Dropdown, Menu, Button, Space, DatePicker } from "antd";
import { addExpenseApi, addIncomeApi, getExpensesApi, getIncomeApi, getSummaryApi } from "../../Api/action";
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

    // Category Lists
    expenseCategories,
    incomeCategories
}) {
    if (!open) return null;
    const [lastMonthBalance, setLastMonthBalance] = useState(0);

    const handleDateChange = async (v) => {
        const d = v ? v.format("YYYY-MM-DD") : null;
        setDate(d);

        if (d) {
            const result = await getLastMonthSummaryApi(d);
            setLastMonthBalance(result.balance);  // ✅ store balance dynamically
        }
    };

    const handleSubmit = async () => {
        if (branch === "Select Branch") return CommonToaster("Select branch", "error");
        if (!date) return CommonToaster("Select date", "error");
        if (!total) return CommonToaster("Enter total amount", "error");
        if (mainCategory === "Select Main Category") return CommonToaster("Select main category", "error");

        if (type === "expense" && subCategory === "Select Category")
            return CommonToaster("Select sub category", "error");

        const payload = {
            user_id: 1,
            branch,
            date,
            total,
            mainCategory,
            subCategory: type === "expense" ? subCategory : null,
            description,
            invoice: null
        };

        try {
            if (type === "expense") {
                await addExpenseApi(payload);
                CommonToaster("Expense added successfully!", "success");
            } else {
                await addIncomeApi(payload);
                CommonToaster("Income added successfully!", "success");
            }

            // ✅ Reset form
            setBranch("Select Branch");
            setDate(dayjs().format("YYYY-MM-DD"));
            setTotal("");
            setMainCategory("Select Main Category");
            setSubCategory("Select Category");
            setDescription("");

            onClose();

            // ✅ *** Trigger global update event ***
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
                { key: "Branch 1", label: "Branch 1" },
                { key: "Branch 2", label: "Branch 2" },
                { key: "Branch 3", label: "Branch 3" },
            ]}
        />
    );

    return (
        <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className="expense-modal"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
            >
                {/* HEADER */}
                <div className="modal-header">
                    <h2>New {type === "expense" ? "Expense" : "Income"}</h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={18} />
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
                        </div>
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
