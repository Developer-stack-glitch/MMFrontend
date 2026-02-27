import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Upload } from "lucide-react";
import { Dropdown, Menu, Button, Space, DatePicker, Checkbox, Radio, Select, Modal } from "antd";
import { addExpenseApi, addApprovalApi, addIncomeApi, editExpenseApi, editIncomeApi, safeGetLocalStorage, getUsersApi, getVendorsApi, addVendorApi } from "../../Api/action";
import { DownOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { CommonToaster } from "../../Common/CommonToaster";
import AddCategoryModal from "./AddCategoryModal";

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
    editData,
}) {
    if (!open) return null;

    const [invoices, setInvoices] = useState([]); // Now stores File objects
    const [invoiceFiles, setInvoiceFiles] = useState([]); // Actual File objects for upload
    const [spendMode, setSpendMode] = useState("Select Spend Mode");
    const [gst, setGst] = useState("No");
    const [vendorGst, setVendorGst] = useState(""); // Vendor's GST Number
    const [activeModalTab, setActiveModalTab] = useState(type);
    const [transactionFrom, setTransactionFrom] = useState(null);
    const [transactionTo, setTransactionTo] = useState("");
    const [usersList, setUsersList] = useState([]);
    const [endDate, setEndDate] = useState(null);

    // Vendor State
    const [vendorType, setVendorType] = useState("Regular");
    const [vendorList, setVendorList] = useState([]);
    const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
    const [newVendorName, setNewVendorName] = useState("");
    const [newVendorNumber, setNewVendorNumber] = useState("");
    const [newVendorCompany, setNewVendorCompany] = useState("");
    const [newVendorGst, setNewVendorGst] = useState("");
    const [newVendorEmail, setNewVendorEmail] = useState("");
    const [newVendorAddress, setNewVendorAddress] = useState("");

    const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
    const [addCategoryInitialMain, setAddCategoryInitialMain] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isVendorSubmitting, setIsVendorSubmitting] = useState(false);

    const currentUser = safeGetLocalStorage("loginDetails", {});

    // Update activeModalTab when type prop changes
    useEffect(() => {
        setActiveModalTab(type);
    }, [type]);

    // Fetch users for "Transaction From"
    useEffect(() => {
        if (open) {
            getUsersApi().then((res) => {
                setUsersList(res || []);
            }).catch(err => console.error("Failed to load users", err));

            getVendorsApi().then((res) => {
                setVendorList(res || []);
            }).catch(err => console.error("Failed to load vendors", err));
        }
    }, [open]);

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
            setInvoiceFiles([]); // Reset file objects for edit

            // spend mode
            let sm = editData.spend_mode || "Select Spend Mode";
            if (/^\d{4}-\d{2}-\d{2}$/.test(sm)) {
                sm = "Select Spend Mode";
            }
            setSpendMode(sm);

            // Vendor & End Date
            setGst(editData.gst === "Yes" || editData.gst === true ? "Yes" : "No");
            setVendorGst(editData.vendor_gst || "");
            setTransactionFrom(editData.transaction_from || null);
            setTransactionTo(editData.transaction_to || "");
            setEndDate(editData.end_date ? dayjs(editData.end_date) : null);
        }

        if (open && !isEdit) {
            setInvoices([]);
            setInvoiceFiles([]);
            setSpendMode("Select Spend Mode");

            setGst("No");
            setVendorGst("");
            setTransactionFrom(null);
            setTransactionTo("");
            setEndDate(null);
        }
    }, [open, isEdit, editData]);

    const handleDateChange = (v) => {
        const d = v ? v.format("YYYY-MM-DD") : null;
        setDate(d);
    };



    const handleFileChange = (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        // Store actual File objects
        setInvoiceFiles((prev) => [...prev, ...files]);

        // Create preview URLs for display
        const previewPromises = files.map((file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve({ preview: reader.result, type: file.type, name: file.name });
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        });

        Promise.all(previewPromises)
            .then((previews) => {
                setInvoices((prev) => [...prev, ...previews]);
            })
            .catch(() => {
                CommonToaster("Error reading files", "error");
            });
    };

    const removeInvoice = (index) => {
        setInvoices((prev) => prev.filter((_, i) => i !== index));
        setInvoiceFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSaveNewVendor = async () => {
        if (!newVendorName) return CommonToaster("Vendor name is required", "error");
        if (!newVendorCompany) return CommonToaster("Company name is required", "error");
        if (!newVendorGst) return CommonToaster("GST number is required", "error");
        if (!newVendorNumber) return CommonToaster("Vendor number is required", "error");
        setIsVendorSubmitting(true);
        try {
            await addVendorApi({
                name: newVendorName,
                number: newVendorNumber,
                company_name: newVendorCompany,
                gst: newVendorGst,
                email: newVendorEmail,
                address: newVendorAddress
            });
            CommonToaster("Vendor added!", "success");
            const updatedVendors = await getVendorsApi();
            setVendorList(updatedVendors);
            setTransactionTo(newVendorName); // Auto-select
            setIsAddVendorOpen(false);
            setNewVendorName("");
            setNewVendorNumber("");
            setNewVendorCompany("");
            setNewVendorGst("");
            setNewVendorEmail("");
            setNewVendorAddress("");
        } catch (err) {
            CommonToaster("Failed to add vendor", "error");
        } finally {
            setIsVendorSubmitting(false);
        }
    };

    const handleSubmit = async () => {
        if (branch === "Select Branch") return CommonToaster("Select branch", "error");
        if (!date) return CommonToaster("Select date", "error");
        if (!total) return CommonToaster("Enter total amount", "error");
        if (mainCategory === "Select Main Category") return CommonToaster("Select main category", "error");

        const isExpenseOrApproval = activeModalTab === "expense" || activeModalTab === "approval" || activeModalTab === "edit-approval";

        if (isExpenseOrApproval && subCategory === "Select Category")
            return CommonToaster("Select sub category", "error");

        if (activeModalTab === "expense" && spendMode === "Select Spend Mode")
            return CommonToaster("Select spend mode", "error");

        if (activeModalTab === "approval" || activeModalTab === "edit-approval" || activeModalTab === "expense") {
            if (!transactionFrom) return CommonToaster("Select Transaction From", "error");

            // Vendor is only required for Expenses now
            if (activeModalTab === "expense" && !transactionTo) {
                return CommonToaster("Select Vendor", "error");
            }

            if (!description || !description.trim()) return CommonToaster("Enter Description", "error");
            if (invoices.length === 0) return CommonToaster("Upload Invoice", "error");
        }

        if (activeModalTab === "approval" || activeModalTab === "edit-approval") {
            if (!endDate) return CommonToaster("Select End Date", "error");
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();

            // Append all form fields
            formData.append("user_id", currentUser?.id);
            formData.append("branch", branch);
            formData.append("date", date);

            console.log("=== FRONTEND DEBUG ===");
            console.log("Total value before sending:", total);
            console.log("Type:", typeof total);
            console.log("======================");

            formData.append("total", total);
            formData.append("mainCategory", mainCategory);
            formData.append("subCategory", isExpenseOrApproval ? subCategory : "");
            formData.append("description", description || "");
            formData.append("gst", gst === "Yes" ? "Yes" : "No");
            formData.append("transaction_from", transactionFrom || "");
            formData.append("transaction_to", transactionTo || "");

            // Handle Vendor Details
            let vName = transactionTo || "";
            let vNumber = "";
            let vGst = vendorGst || "";

            if (vendorType === "Regular") {
                const foundVendor = vendorList.find(v => v.name === transactionTo);
                if (foundVendor) {
                    vNumber = foundVendor.number || "";
                    vGst = foundVendor.gst || ""; // Auto-fetch GST for regular vendor
                }
            }
            formData.append("vendor_name", vName);
            formData.append("vendor_number", vNumber);
            formData.append("vendor_gst", vGst);

            formData.append("end_date", endDate ? endDate.format("YYYY-MM-DD") : "");

            if (activeModalTab === "expense") {
                formData.append("spend_mode", spendMode);
            }

            // Append file objects
            invoiceFiles.forEach((file) => {
                formData.append("invoices", file);
            });

            if ((activeModalTab === "expense" || activeModalTab === "edit-approval") && isEdit && editData) {
                // EDIT EXPENSE / APPROVAL FLOW
                const updates = {
                    total,
                    branch,
                    date,
                    mainCategory,
                    subCategory,
                    description,
                    spend_mode: spendMode,
                    gst: gst === "Yes" ? "Yes" : "No",
                    transaction_from: transactionFrom,
                    transaction_to: transactionTo,
                    vendor_name: vName,
                    vendor_number: vNumber,
                    vendor_gst: vGst,
                    end_date: endDate ? endDate.format("YYYY-MM-DD") : null,
                    existingInvoices: JSON.stringify(invoices.filter(inv => typeof inv === 'string' || inv.preview?.startsWith('/uploads'))),
                    source_type: (activeModalTab === "approval" || activeModalTab === "edit-approval") ? "approval" : "expense"
                };

                const editFormData = new FormData();
                editFormData.append("expense_id", editData.id);
                editFormData.append("user_id", currentUser?.id);
                editFormData.append("updates", JSON.stringify(updates));

                // Append new files for edit
                invoiceFiles.forEach((file) => {
                    editFormData.append("invoices", file);
                });

                const res = await editExpenseApi(editFormData);
                CommonToaster(res.data?.message || "Updated successfully!", "success");
            } else if (activeModalTab === "edit-income" && isEdit && editData) {
                // EDIT INCOME FLOW
                const updates = {
                    total,
                    branch,
                    date,
                    mainCategory,
                    description,
                    existingInvoices: JSON.stringify(invoices.filter(inv => typeof inv === 'string' || inv.preview?.startsWith('/uploads')))
                };

                const editFormData = new FormData();
                editFormData.append("income_id", editData.id);
                editFormData.append("user_id", currentUser?.id);
                editFormData.append("updates", JSON.stringify(updates));

                // Append new files for edit
                invoiceFiles.forEach((file) => {
                    editFormData.append("invoices", file);
                });

                const res = await editIncomeApi(editFormData);
                CommonToaster(res.data?.message || "Income updated successfully!", "success");
            } else if (isExpenseOrApproval) {
                // ADD EXPENSE or APPROVAL FLOW
                if (activeModalTab === "approval") {
                    await addApprovalApi(formData);
                    CommonToaster("Approval request sent!", "success");
                } else {
                    await addExpenseApi(formData);
                    CommonToaster("Expense added!", "success");
                }
            } else {
                // ADD INCOME FLOW
                await addIncomeApi(formData);
                CommonToaster("Income added successfully!", "success");
            }

            // Reset local-only state
            setInvoices([]);
            setInvoiceFiles([]);
            setSpendMode("Select Spend Mode");
            setGst("No");
            setTransactionFrom(null);
            setTransactionTo("");

            onClose();

            // Trigger reloads
            setTimeout(() => {
                window.dispatchEvent(new Event("summaryUpdated"));
            }, 50);
            setTimeout(() => {
                window.dispatchEvent(new Event("incomeExpenseUpdated"));
            }, 50);
        } catch (err) {
            CommonToaster(err?.message || "Server Error", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const branchMenu = (
        <Menu
            onClick={(e) => setBranch(e.key)}
            items={[
                { key: "Overall", label: "Overall" },
                { key: "Personal", label: "Personal" },
                { key: "Linkplux", label: "Linkplux" },
                {
                    type: 'group',
                    label: 'CHENNAI',
                    children: [
                        { key: "Chennai", label: "Chennai" },
                        { key: "Velachery", label: "Velachery" },
                        { key: "Anna Nagar", label: "Anna Nagar" },
                        { key: "Porur", label: "Porur" },
                        { key: "OMR", label: "OMR" },
                    ]
                },
                {
                    type: 'group',
                    label: 'BANGALORE',
                    children: [
                        { key: "Bangalore", label: "Bangalore" },
                        { key: "Electronic City", label: "Electronic City" },
                        { key: "BTM Layout", label: "BTM Layout" },
                        { key: "Marathahalli", label: "Marathahalli" },
                        { key: "Rajaji Nagar", label: "Rajaji Nagar" },
                    ]
                },
                {
                    type: 'group',
                    label: 'HUB',
                    children: [
                        { key: "BDC", label: "BDC" },
                        { key: "BDC 2", label: "BDC 2" },
                    ]
                }
            ]}
        />
    );

    const resetFormFields = () => {
        setBranch("Select Branch");
        setDate(dayjs().format("YYYY-MM-DD"));
        setTotal("");
        setMainCategory("Select Main Category");
        setSubCategory("Select Category");
        setDescription("");

        setInvoices([]);
        setInvoiceFiles([]);
        setSpendMode("Select Spend Mode");
        setGst("No");
        setVendorGst("");
        setTransactionFrom(null);
        setTransactionTo("");
        setEndDate(null);
        setVendorType("Regular");
    };

    const handleTabSwitch = (newTab) => {
        setActiveModalTab(newTab);
        resetFormFields();
    };

    const isExpense = activeModalTab === "expense";
    const isApproval = activeModalTab === "approval" || activeModalTab === "edit-approval";
    const isIncome = activeModalTab === "income";

    const getTitle = () => {
        if (isEdit) {
            if (activeModalTab === "approval" || activeModalTab === "edit-approval") return "Edit Approval";
            if (activeModalTab === "expense") return "Edit Expense";
            if (activeModalTab === "income" || activeModalTab === "edit-income") return "Edit Income";
        }
        if (isApproval) return "New Approval";
        if (isExpense) return "New Expense";
        return "New Income";
    };

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
                    <h2>{getTitle()}</h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* TABS SWITCHER */}
                {!isEdit && type !== "income" && (
                    <div style={{ display: "flex", gap: 10, marginTop: 10, marginBottom: 15 }}>
                        {currentUser?.role === "admin" || currentUser?.role === "superadmin" ? (
                            // ADMIN TABS: Expense only
                            ["expense"].map(t => (
                                <motion.button
                                    key={t}
                                    onClick={() => handleTabSwitch(t)}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    style={{
                                        padding: "8px 14px",
                                        borderRadius: 8,
                                        border: activeModalTab === t ? "none" : "1px solid #ccc",
                                        background: activeModalTab === t ? "#d4af37" : "#f1f1f1",
                                        color: activeModalTab === t ? "white" : "black",
                                        cursor: "pointer",
                                        fontWeight: 600,
                                        textTransform: "capitalize"
                                    }}
                                >
                                    {t}
                                </motion.button>
                            ))
                        ) : (
                            // USER TABS: Approval / Expense
                            ["approval", "expense"].map(t => (
                                <motion.button
                                    key={t}
                                    onClick={() => handleTabSwitch(t)}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    style={{
                                        padding: "8px 14px",
                                        borderRadius: 8,
                                        border: activeModalTab === t ? "none" : "1px solid #ccc",
                                        background: activeModalTab === t ? "#d4af37" : "#f1f1f1",
                                        color: activeModalTab === t ? "white" : "black",
                                        cursor: "pointer",
                                        fontWeight: 600,
                                        textTransform: "capitalize"
                                    }}
                                >
                                    {t}
                                </motion.button>
                            ))
                        )}
                    </div>
                )}

                <hr />
                {/* BODY */}
                <div className="modal-body">
                    <div className="form-section">

                        {/* Date */}
                        <div style={{ marginBottom: "10px" }}>
                            <label>Date <span style={{ color: "red" }}>*</span></label>
                            <DatePicker
                                value={date ? dayjs(date) : null}
                                onChange={handleDateChange}
                                style={{ width: "100%", height: 40 }}
                            />
                        </div>


                        {/* CATEGORIES */}
                        {/* Expense & Approval use Expense Categories */}
                        <AnimatePresence mode="wait">
                            {(isExpense || isApproval) && (
                                <motion.div
                                    key="expense-categories"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <label>Main Category (Expense) <span style={{ color: "red" }}>*</span></label>
                                    <div style={{ marginTop: "8px", marginBottom: "8px" }}>
                                        <Dropdown
                                            overlay={
                                                <Menu
                                                    onClick={(e) => {
                                                        if (e.key === "ADD_NEW_MAIN") {
                                                            setAddCategoryInitialMain("");
                                                            setIsAddCategoryOpen(true);
                                                        } else {
                                                            setMainCategory(e.key);
                                                            setSubCategory("Select Category");
                                                        }
                                                    }}
                                                    items={[
                                                        ...Object.keys(expenseCategories).map((cat) => ({
                                                            key: cat,
                                                            label: cat,
                                                        })),
                                                        ...(currentUser?.role === "admin" || currentUser?.role === "superadmin" ? [
                                                            {
                                                                type: 'divider',
                                                            },
                                                            {
                                                                key: "ADD_NEW_MAIN",
                                                                label: (
                                                                    <span style={{ color: "#d4af37", fontWeight: 600 }}>
                                                                        + Add New Main Category
                                                                    </span>
                                                                ),
                                                            }
                                                        ] : [])
                                                    ]}
                                                />
                                            }
                                            trigger={["click"]}
                                        >
                                            <Button style={{ width: "100%", height: 40 }}>
                                                <Space>{mainCategory}<DownOutlined /></Space>
                                            </Button>
                                        </Dropdown>
                                    </div>

                                    {mainCategory !== "Select Main Category" && (
                                        <>
                                            <label>Sub Category <span style={{ color: "red" }}>*</span></label>
                                            <div style={{ marginTop: "8px" }}>
                                                <Dropdown
                                                    overlay={
                                                        <Menu
                                                            onClick={(e) => {
                                                                if (e.key === "ADD_NEW_SUB") {
                                                                    setAddCategoryInitialMain(mainCategory);
                                                                    setIsAddCategoryOpen(true);
                                                                } else {
                                                                    setSubCategory(e.key);
                                                                }
                                                            }}
                                                            items={[
                                                                ...(Array.isArray(expenseCategories[mainCategory])
                                                                    ? expenseCategories[mainCategory].map((sub) => ({
                                                                        key: sub,
                                                                        label: sub,
                                                                    }))
                                                                    : []),
                                                                ...(currentUser?.role === "admin" || currentUser?.role === "superadmin" ? [
                                                                    {
                                                                        type: 'divider',
                                                                    },
                                                                    {
                                                                        key: "ADD_NEW_SUB",
                                                                        label: (
                                                                            <span style={{ color: "#d4af37", fontWeight: 600 }}>
                                                                                + Add New Sub Category
                                                                            </span>
                                                                        ),
                                                                    }
                                                                ] : [])
                                                            ]}
                                                        />
                                                    }
                                                    trigger={["click"]}
                                                >
                                                    <Button style={{ width: "100%", height: 40 }}>
                                                        <Space>{subCategory}<DownOutlined /></Space>
                                                    </Button>
                                                </Dropdown>
                                            </div>
                                        </>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

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

                        {/* Description */}
                        <label style={{ marginTop: 10, display: "block" }}>Description <span style={{ color: "red" }}>*</span></label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add a description..."
                            style={{ width: "100%", marginTop: 5 }}
                        />

                        {/* EXPENSE ONLY FIELDS: SPEND MODE */}
                        <AnimatePresence mode="wait">
                            {isExpense && (
                                <motion.div
                                    key="expense-spend-mode"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <label>Spend Mode <span style={{ color: "red" }}>*</span></label><br></br>
                                    <div style={{ marginTop: "8px", marginBottom: "10px" }}>
                                        <Dropdown
                                            overlay={
                                                <Menu
                                                    onClick={(e) => setSpendMode(e.key)}
                                                    items={[
                                                        { key: "CASH", label: "CASH" },
                                                        { key: "UPI", label: "UPI" },
                                                        { key: "NEFT", label: "NEFT" },
                                                        { key: "IMPS", label: "IMPS" },
                                                        { key: "CARD", label: "CARD" },
                                                        { key: "NET BANKING", label: "NET BANKING" },
                                                    ]}
                                                />
                                            }
                                            trigger={["click"]}
                                        >
                                            <Button style={{ width: "100%", height: 40 }}>
                                                <Space>{spendMode}<DownOutlined /></Space>
                                            </Button>
                                        </Dropdown>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* TRANSACTION FIELDS: FROM (Expense & Approval) */}
                        <AnimatePresence mode="wait">
                            {(isExpense || isApproval) && (
                                <motion.div
                                    key="transaction-from-field"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <div style={{ marginBottom: "20px" }}>
                                        {/* Transaction From */}
                                        <label style={{ display: "block" }}>Transaction From <span style={{ color: "red" }}>*</span></label>
                                        <Select
                                            showSearch
                                            style={{ width: "100%", marginTop: 5 }}
                                            placeholder="Select User"
                                            optionFilterProp="children"
                                            value={transactionFrom}
                                            onChange={(val) => setTransactionFrom(val)}
                                            filterOption={(input, option) =>
                                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                            }
                                            options={[
                                                "Prakash Kotak",
                                                "Ajith Kotak",
                                                "Sathish ICICI",
                                                "Cheran",
                                                "ACTE SBI",
                                                "ACTE HDFC",
                                                "ACTE RBL",
                                                "ACTE AXIS",
                                                "LEARNOVITA SBI"
                                            ].map(opt => ({ value: opt, label: opt }))}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* TRANSACTION FIELDS: TO / VENDOR (Expense ONLY) */}
                        <AnimatePresence mode="wait">
                            {isExpense && (
                                <motion.div
                                    key="transaction-to-field"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <label style={{ marginTop: 10, display: "block" }}>Transaction To / Vendor <span style={{ color: "red" }}>*</span></label>
                                    <Radio.Group
                                        value={vendorType}
                                        onChange={(e) => {
                                            setVendorType(e.target.value);
                                            setTransactionTo("");
                                        }}
                                        style={{ marginTop: 5, marginBottom: 10 }}
                                    >
                                        <Radio value="Regular">Regular Vendor</Radio>
                                        <Radio value="One Time">One Time Vendor</Radio>
                                    </Radio.Group>

                                    {vendorType === "Regular" ? (
                                        <div style={{ marginBottom: 5 }}>
                                            <Select
                                                showSearch
                                                style={{ width: "100%", height: 40 }}
                                                placeholder="Select Vendor"
                                                optionFilterProp="children"
                                                value={transactionTo ? transactionTo : undefined}
                                                onChange={(val) => setTransactionTo(val)}
                                                filterOption={(input, option) =>
                                                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                                }
                                                options={vendorList.map(v => ({ value: v.name, label: v.name }))}
                                            />
                                            <Button
                                                style={{ color: "#d4af37", paddingTop: 4 }}
                                                type="link"
                                                size="small"
                                                onClick={() => setIsAddVendorOpen(true)}
                                            >
                                                + Add New Vendor
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <input
                                                type="text"
                                                value={transactionTo}
                                                onChange={(e) => setTransactionTo(e.target.value)}
                                                placeholder="Enter Vendor Name"
                                                style={{ height: 40, width: "100%", marginTop: 5 }}
                                            />
                                            <input
                                                type="text"
                                                value={vendorGst}
                                                onChange={(e) => setVendorGst(e.target.value)}
                                                placeholder="Enter GST Number"
                                                style={{ height: 40, width: "100%", marginTop: 5 }}
                                            />
                                        </>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Amount */}
                        <label>Amount <span style={{ color: "red" }}>*</span></label>
                        <input
                            type="number"
                            value={total}
                            onChange={(e) => {
                                console.log("Input onChange - e.target.value:", e.target.value);
                                setTotal(e.target.value);
                            }}
                            placeholder="0.00"
                            style={{ height: 40 }}
                        />

                        {/* GST Selection */}
                        {isExpense && (
                            <div style={{ marginTop: 20 }}>
                                <label style={{ display: "block" }}>GST? <span style={{ color: "red" }}>*</span></label>
                                <Radio.Group
                                    value={gst}
                                    onChange={(e) => setGst(e.target.value)}
                                    style={{ marginTop: 5 }}
                                >
                                    <Radio value="Yes">Yes</Radio>
                                    <Radio value="No">No</Radio>
                                </Radio.Group>
                            </div>
                        )}

                        {/* INCOME CATEGORIES */}
                        <AnimatePresence mode="wait">
                            {isIncome && (
                                <motion.div
                                    key="income-categories"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <label>Income Category <span style={{ color: "red" }}>*</span></label>
                                    <div style={{ marginTop: "8px" }}>
                                        <Dropdown
                                            overlay={
                                                <Menu
                                                    onClick={(e) => setMainCategory(e.key)}
                                                    items={incomeCategories.map((cat) => {
                                                        const label = cat.name || cat.category || cat;
                                                        return {
                                                            key: label,
                                                            label: label,
                                                        };
                                                    })}
                                                />
                                            }
                                            trigger={["click"]}
                                        >
                                            <Button style={{ width: "100%", height: 40 }}>
                                                <Space>{mainCategory}<DownOutlined /></Space>
                                            </Button>
                                        </Dropdown>
                                    </div>

                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* APPROVAL ONLY FIELDS */}
                        <AnimatePresence mode="wait">
                            {isApproval && (
                                <motion.div
                                    key="approval-specific-fields"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    style={{ marginTop: 10 }}
                                >
                                    <div style={{ marginBottom: 15 }}>
                                        <label>End Date <span style={{ color: "red" }}>*</span></label>
                                        <DatePicker
                                            value={endDate}
                                            onChange={(val) => setEndDate(val)}
                                            style={{ width: "100%", height: 40, marginTop: 5 }}
                                        />
                                    </div>
                                    <label>GST <span style={{ color: "red" }}>*</span></label><br />
                                    <Radio.Group onChange={(e) => setGst(e.target.value)} value={gst}>
                                        <Radio value="Yes">Yes</Radio>
                                        <Radio value="No">No</Radio>
                                    </Radio.Group>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* UPLOAD */}
                    <div className="upload-section" style={{ marginTop: 20 }}>
                        <div className="upload-box">
                            <Upload size={40} strokeWidth={1.5} />
                            <p>Upload invoices <span style={{ color: "red" }}>*</span></p>

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
                                    cursor: "pointer",
                                    width: "100%",
                                    top: 0,
                                    left: 0
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
                                    {invoices.map((inv, idx) => {
                                        const isPreview = inv.preview;
                                        const isPdf = isPreview ? inv.type?.includes("pdf") : (typeof inv === "string" && inv.includes(".pdf"));
                                        const displaySrc = isPreview ? inv.preview : (typeof inv === "string" ? `${(import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, "")}${inv}` : inv);

                                        return (
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
                                                {isPdf ? (
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
                                                        src={displaySrc}
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
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer">
                    <button
                        className="btn-draft"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        style={{ opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? "not-allowed" : "pointer" }}
                    >
                        {isSubmitting ? "Submitting..." : (isEdit ? "Update" : "Submit")}
                    </button>
                </div>

                {/* Add Vendor Modal */}
                <Modal
                    title="Add New Vendor"
                    open={isAddVendorOpen}
                    onCancel={() => setIsAddVendorOpen(false)}
                    onOk={handleSaveNewVendor}
                    confirmLoading={isVendorSubmitting}
                    centered
                >
                    <div style={{ marginBottom: 15 }}>
                        <label style={{ display: "block", marginBottom: 5 }}>Vendor Name <span style={{ color: "red" }}>*</span></label>
                        <input
                            type="text"
                            value={newVendorName}
                            onChange={(e) => setNewVendorName(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "8px 10px",
                                border: "1px solid #d9d9d9",
                                borderRadius: 6
                            }}
                            placeholder="e.g. ABC Supplies"
                        />
                    </div>
                    <div style={{ marginBottom: 15 }}>
                        <label style={{ display: "block", marginBottom: 5 }}>Company Name <span style={{ color: "red" }}>*</span></label>
                        <input
                            type="text"
                            value={newVendorCompany}
                            onChange={(e) => setNewVendorCompany(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "8px 10px",
                                border: "1px solid #d9d9d9",
                                borderRadius: 6
                            }}
                            placeholder="e.g. ABC Pvt Ltd"
                        />
                    </div>
                    <div style={{ marginBottom: 15 }}>
                        <label style={{ display: "block", marginBottom: 5 }}>GST Number <span style={{ color: "red" }}>*</span></label>
                        <input
                            type="text"
                            value={newVendorGst}
                            onChange={(e) => setNewVendorGst(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "8px 10px",
                                border: "1px solid #d9d9d9",
                                borderRadius: 6
                            }}
                            placeholder="GST Number"
                        />
                    </div>
                    <div style={{ marginBottom: 15 }}>
                        <label style={{ display: "block", marginBottom: 5 }}>Mail ID</label>
                        <input
                            type="email"
                            value={newVendorEmail}
                            onChange={(e) => setNewVendorEmail(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "8px 10px",
                                border: "1px solid #d9d9d9",
                                borderRadius: 6
                            }}
                            placeholder="example@mail.com"
                        />
                    </div>
                    <div style={{ marginBottom: 15 }}>
                        <label style={{ display: "block", marginBottom: 5 }}>Address</label>
                        <textarea
                            value={newVendorAddress}
                            onChange={(e) => setNewVendorAddress(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "8px 10px",
                                border: "1px solid #d9d9d9",
                                borderRadius: 6
                            }}
                            placeholder="Vendor Address"
                            rows={3}
                        />
                    </div>
                    <div>
                        <label style={{ display: "block", marginBottom: 5 }}>Vendor Number <span style={{ color: "red" }}>*</span></label>
                        <input
                            type="text"
                            value={newVendorNumber}
                            onChange={(e) => setNewVendorNumber(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "8px 10px",
                                border: "1px solid #d9d9d9",
                                borderRadius: 6
                            }}
                            placeholder="e.g. +91 9876543210"
                        />
                    </div>
                </Modal>

                {/* ADD CATEGORY MODAL */}
                <AddCategoryModal
                    open={isAddCategoryOpen}
                    onClose={() => setIsAddCategoryOpen(false)}
                    initialMainCategory={addCategoryInitialMain}
                    existingCategories={Object.keys(expenseCategories)}
                    onSuccess={(main, sub) => {
                        setMainCategory(main);
                        setSubCategory(sub);
                    }}
                />
            </motion.div>
        </motion.div >
    );
}
