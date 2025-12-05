import React, { useEffect, useMemo, useState } from "react";
import { Eye, Check, X } from "lucide-react";
import * as Icons from "lucide-react";
import { motion } from "framer-motion";
import { Select, Button, Modal, Popconfirm, Tooltip } from "antd";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
dayjs.extend(isBetween);

import {
    getApprovalsApi,
    approveExpenseApi,
    rejectExpenseApi,
} from "../../Api/action";

import { CommonToaster } from "../../Common/CommonToaster";
import Filters from "../Filters/Filters";
import { FullPageLoader } from "../../Common/FullPageLoader";

export default function Approvals() {

    // ✅ FILTERS (from Filter.js)
    const [filters, setFilters] = useState({
        filterType: "year",
        compareMode: false,
        value: dayjs(),
    });

    // ✅ Other custom filters
    const [filterCategory, setFilterCategory] = useState("All");
    const [filterAmount, setFilterAmount] = useState("");
    const [searchText, setSearchText] = useState("");
    const [loading, setLoading] = useState(true)
    const [requests, setRequests] = useState([]);
    // Invoice Modal
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [currentInvoices, setCurrentInvoices] = useState([]);
    const [currentInvoiceIndex, setCurrentInvoiceIndex] = useState(0);
    // ✅ Details Modal
    const [showDetails, setShowDetails] = useState(false);
    const [selected, setSelected] = useState(null);

    // ✅ Load Approvals
    useEffect(() => {
        loadApprovals();

        // Reload when transactions are updated
        window.addEventListener("incomeExpenseUpdated", loadApprovals);
        window.addEventListener("summaryUpdated", loadApprovals);

        return () => {
            window.removeEventListener("incomeExpenseUpdated", loadApprovals);
            window.removeEventListener("summaryUpdated", loadApprovals);
        };
    }, []);

    const loadApprovals = async () => {
        setLoading(true)
        const data = await getApprovalsApi();
        setRequests(Array.isArray(data) ? data : []);
        setLoading(false)
    };

    // ✅ Helper
    const fmtDate = (d) => (d ? dayjs(d).format("DD/MM/YYYY") : "-");
    const fmtAmt = (n) =>
        `₹${Number(String(n ?? 0).replace(/[^0-9.-]+/g, "")) || 0}`;

    const openDetails = (row) => {
        setSelected(row);
        setShowDetails(true);
    };

    // ✅ Approve
    const doApprove = async (row) => {
        try {
            await approveExpenseApi({ id: row.id });

            setRequests((prev) => prev.filter((r) => r.id !== row.id));
            window.dispatchEvent(new Event("incomeExpenseUpdated"));

            CommonToaster("Approved and added to expenses!", "success");
            setShowDetails(false);
        } catch (err) {
            CommonToaster("Error approving!", "error");
        }
    };

    // ✅ Reject
    const doReject = async (row) => {
        try {
            await rejectExpenseApi({ id: row.id });

            setRequests((prev) => prev.filter((r) => r.id !== row.id));
            window.dispatchEvent(new Event("incomeExpenseUpdated"));

            CommonToaster("Request Rejected!", "success");
        } catch (err) {
            CommonToaster("Error rejecting!", "error");
        }
    };

    // ✅ Extract categories from Requests
    const categoryOptions = useMemo(() => {
        const set = new Set();
        requests.forEach((r) => r?.category && set.add(r.category));
        return ["All", ...Array.from(set)];
    }, [requests]);


    // ✅ ✅ ✅ APPLY DATE FILTER (From Dashboard)
    const applyFilters = (items) => {
        if (!filters.value) return items;

        const type = filters.filterType;

        // ✅ Normal Mode (not compare)
        if (!filters.compareMode) {
            return items.filter((item) => {
                const d = dayjs(item.date);

                if (type === "date") return d.isSame(filters.value, "day");
                if (type === "week") return d.isSame(filters.value, "week");
                if (type === "month") return d.isSame(filters.value, "month");
                if (type === "year") return d.isSame(filters.value, "year");

                return true;
            });
        }

        // ✅ Compare Mode
        if (!Array.isArray(filters.value) || filters.value.length !== 2)
            return items;

        const [start, end] = filters.value;

        return items.filter((item) => {
            const d = dayjs(item.date);

            if (type === "date") return d.isBetween(start, end, "day", "[]");
            if (type === "week") return d.isBetween(start, end, "week", "[]");
            if (type === "month") return d.isBetween(start, end, "month", "[]");
            if (type === "year") return d.isBetween(start, end, "year", "[]");

            return true;
        });
    };

    // -------------------------------------
    // Invoice
    // -------------------------------------
    // -------------------------------------
    // Invoice
    // -------------------------------------
    const handleViewInvoice = (invoiceData) => {
        if (!invoiceData) return;

        const API_BASE = import.meta.env.VITE_API_URL;
        let invoicesArray = [];

        const normalizeEntry = (entry) => {
            if (!entry) return null;

            // Ensure it's a clean string
            let str = String(entry).trim();

            // Remove wrapping quotes if present:  "data:..."  →  data:...
            str = str.replace(/^"+|"+$/g, "");

            // If it's a Base64 / data URL → return as-is
            if (str.startsWith("data:")) {
                return str;
            }

            // Otherwise treat as filename
            return `${API_BASE}/uploads/invoices/${str}`;
        };

        // 1) If it's already an array
        if (Array.isArray(invoiceData)) {
            invoicesArray = invoiceData
                .map(normalizeEntry)
                .filter(Boolean);
        }
        // 2) If it's a JSON string representing an array: '["data:...","file.jpg"]'
        else if (typeof invoiceData === "string" && invoiceData.trim().startsWith("[")) {
            try {
                const parsed = JSON.parse(invoiceData);
                if (Array.isArray(parsed)) {
                    invoicesArray = parsed
                        .map(normalizeEntry)
                        .filter(Boolean);
                }
            } catch (e) {
                // fallback to single entry handling below
            }
        }

        // 3) Fallback: single string (either "data:..." or "filename.ext")
        if (!invoicesArray.length) {
            invoicesArray = [normalizeEntry(invoiceData)].filter(Boolean);
        }

        if (!invoicesArray.length) return;

        setCurrentInvoices(invoicesArray);
        setCurrentInvoiceIndex(0);
        setShowInvoiceModal(true);
    };


    const handleNextInvoice = () => {
        setCurrentInvoiceIndex((prev) =>
            prev < currentInvoices.length - 1 ? prev + 1 : prev
        );
    };

    const handlePrevInvoice = () => {
        setCurrentInvoiceIndex((prev) => (prev > 0 ? prev - 1 : prev));
    };



    // ✅ Step 1: APPLY DATE FILTER
    let filteredRows = applyFilters(requests);

    // ✅ Step 2: APPLY SEARCH
    if (searchText.trim()) {
        filteredRows = filteredRows.filter((r) =>
            `${r.name} ${r.category} ${r.branch} ${fmtDate(r.date)}`
                .toLowerCase()
                .includes(searchText.toLowerCase())
        );
    }

    // ✅ Step 3: APPLY CATEGORY
    if (filterCategory !== "All") {
        filteredRows = filteredRows.filter((r) => r.category === filterCategory);
    }

    // ✅ Step 4: APPLY AMOUNT SORT
    const parseAmt = (n) =>
        Number(String(n ?? 0).replace(/[^0-9.-]+/g, "")) || 0;

    if (filterAmount === "low") {
        filteredRows.sort((a, b) => parseAmt(a.amount) - parseAmt(b.amount));
    } else if (filterAmount === "high") {
        filteredRows.sort((a, b) => parseAmt(b.amount) - parseAmt(a.amount));
    }


    const clearAllFilters = () => {
        setFilterCategory("All");
        setFilterAmount("");
        setSearchText("");
    };

    const renderIcon = (iconVal) => {
        const MaybeIcon = Icons[iconVal];
        if (MaybeIcon) return <MaybeIcon size={28} className="avatar" />;
        return <img src={iconVal} className="avatar" alt="" />;
    };

    return (
        <>
            {loading ? (<FullPageLoader />) : (
                <>
                    <Filters onFilterChange={setFilters} />
                    <div className="approvals-container">

                        <div className="approvals-header-top">
                            <h1 className="approvals-title">Approvals</h1>
                        </div>

                        {/* ✅ Extra Filters */}
                        <motion.div
                            initial="hidden"
                            animate="visible" className="filter-dropdown">

                            {/* Search */}
                            <div className="filter-item">
                                <label>Search (Name / Branch)</label>
                                <input
                                    type="text"
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    placeholder="Search owner or category"
                                    style={{
                                        width: 240,
                                        padding: "8px 10px",
                                        border: "1px solid #ccc",
                                        borderRadius: 6,
                                        height: 40,
                                    }}
                                />
                            </div>

                            {/* Category */}
                            <div className="filter-item">
                                <label>Category</label>
                                <Select
                                    value={filterCategory}
                                    onChange={setFilterCategory}
                                    style={{ width: 200 }}
                                    options={categoryOptions.map((c) => ({
                                        value: c,
                                        label: c,
                                    }))}
                                />
                            </div>

                            {/* Amount Sort */}
                            <div className="filter-item">
                                <label>Amount</label>
                                <Select
                                    value={filterAmount}
                                    onChange={setFilterAmount}
                                    style={{ width: 180 }}
                                    options={[
                                        { value: "", label: "None" },
                                        { value: "low", label: "Low → High" },
                                        { value: "high", label: "High → Low" },
                                    ]}
                                />
                            </div>

                            <Button className="clear-btn" onClick={clearAllFilters}>
                                Clear All
                            </Button>
                        </motion.div>

                        {/* ✅ TABLE */}
                        <div className="approvals-table-wrapper">
                            <motion.table
                                initial="hidden"
                                animate="visible"
                                className="approvals-table real-table"
                            >
                                {/* HEADER */}
                                <thead>
                                    <tr className="table-header">
                                        <th>SPENDER NAME</th>
                                        <th>CATEGORY</th>
                                        <th>AMOUNT</th>
                                        <th>INVOICE</th>
                                        <th>REQUEST DATE</th>
                                        <th>END DATE</th>
                                        <th>ACTION</th>
                                    </tr>
                                </thead>

                                {/* BODY */}
                                <tbody>
                                    {filteredRows.length === 0 ? (

                                        <tr>
                                            <td></td>
                                            <td></td>
                                            <td colSpan="6" className="no-data-box">
                                                <img
                                                    src="https://cdn-icons-png.flaticon.com/512/4076/4076503.png"
                                                    alt="no data"
                                                    className="no-data-img"
                                                />
                                                <h3>No Data Found</h3>
                                                <p>No approval requests available.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRows.map((row) => (
                                            <tr key={row.id} className="table-row">

                                                {/* 1️⃣ SPENDER NAME */}
                                                <td>
                                                    <div className="owner-cell">
                                                        {renderIcon(row.icon)}
                                                        <div>
                                                            <h4>{row.name}</h4>
                                                            <p>{row.main_category}</p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* 2️⃣ CATEGORY */}
                                                <td>
                                                    <div>
                                                        <span
                                                            className="category-pill"
                                                            style={{
                                                                backgroundColor: row.categoryColor || row.color,
                                                            }}
                                                        >
                                                            {row.category}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* 3️⃣ AMOUNT */}
                                                <td>
                                                    {fmtAmt(row.amount)}<br></br>
                                                    {row.original_expense_id && (
                                                        <span className="editable-pill">
                                                            Editable
                                                        </span>
                                                    )}
                                                </td>

                                                {/* 4️⃣ INVOICE */}
                                                <td>
                                                    {row.invoice ? (
                                                        <button
                                                            className="view-invoice-btn"
                                                            onClick={() =>
                                                                handleViewInvoice(row.invoice)
                                                            }
                                                        >
                                                            View
                                                        </button>
                                                    ) : (
                                                        <span className="no-invoice">No File</span>
                                                    )}
                                                </td>

                                                {/* 5️⃣ Request DATE */}
                                                <td>{fmtDate(row.date)}</td>

                                                {/* 6️⃣ END DATE */}
                                                <td>{fmtDate(row.end_date)}</td>

                                                {/* 7️⃣ ACTION */}
                                                <td>
                                                    <div className="action-cell">
                                                        <Tooltip title="View">
                                                            <Eye
                                                                size={19}
                                                                className="icon view"
                                                                onClick={() => openDetails(row)}
                                                            />
                                                        </Tooltip>

                                                        <Popconfirm
                                                            title="Approve this request?"
                                                            okText="Yes"
                                                            cancelText="No"
                                                            onConfirm={() => doApprove(row)}
                                                        >
                                                            <Tooltip title="Approve">
                                                                <Check size={20} className="icon approve" />
                                                            </Tooltip>
                                                        </Popconfirm>

                                                        <Popconfirm
                                                            title="Reject this request?"
                                                            okText="Yes"
                                                            cancelText="No"
                                                            onConfirm={() => doReject(row)}
                                                        >
                                                            <Tooltip title="Reject">
                                                                <X size={20} className="icon reject" />
                                                            </Tooltip>
                                                        </Popconfirm>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </motion.table>
                        </div>

                        {/* ✅ DETAILS MODAL */}
                        <Modal
                            className="details-modal"
                            open={showDetails}
                            onCancel={() => setShowDetails(false)}
                            footer={null}
                            title="Request Details"
                            centered
                        >
                            {selected && (
                                <div className="details-grid" style={{ display: "grid", gap: 10 }}>
                                    <div><b>Spender Name:</b> {selected.name}</div>
                                    <div><b>Description:</b> {selected.role || "-"}</div>
                                    <div><b>Branch:</b> {selected.branch || "-"}</div>
                                    <div><b>Category:</b> {selected.sub_category}</div>
                                    <div><b>Amount:</b> {fmtAmt(selected.amount)}</div>
                                    <div><b>Request Date:</b> {fmtDate(selected.date)}</div>
                                    <div><b>End Date:</b> {fmtDate(selected.end_date)}</div>
                                    <div><b>Vendor Name:</b> {selected.vendor_name}</div>
                                    <div><b>Vendor Number:</b> {selected.vendor_number}</div>
                                    <div><b>Spend Mode:</b> {selected.spend_mode}</div>
                                    <div
                                        style={{
                                            display: "flex",
                                            gap: 8,
                                            marginTop: 12,
                                            border: "none",
                                            padding: 0,
                                            justifyContent: "flex-start"
                                        }}
                                    >
                                        <Button onClick={() => setShowDetails(false)}>Close</Button>

                                        <Popconfirm
                                            title="Approve this request?"
                                            okText="Yes"
                                            cancelText="No"
                                            onConfirm={() => doApprove(selected)}
                                        >
                                            <Button type="primary">Approve</Button>
                                        </Popconfirm>
                                    </div>
                                </div>
                            )}
                        </Modal>
                    </div>
                </>
            )}
            {showInvoiceModal && currentInvoices.length > 0 && (
                <div
                    className="invoice-modal-backdrop"
                    onClick={() => setShowInvoiceModal(false)}
                >
                    <div
                        className="invoice-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 15
                            }}
                        >
                            <h3>
                                Invoice Preview ({currentInvoiceIndex + 1} of {currentInvoices.length})
                            </h3>

                            <button
                                className="close-modal-btn"
                                onClick={() => setShowInvoiceModal(false)}
                            >
                                <Icons.X size={20} />
                            </button>
                        </div>

                        <div style={{ position: "relative", textAlign: "center" }}>

                            {/* LEFT ARROW */}
                            {currentInvoices.length > 1 && currentInvoiceIndex > 0 && (
                                <button
                                    className="invoice-nav-btn-left"
                                    onClick={handlePrevInvoice}
                                >
                                    <Icons.ChevronLeft size={24} color="white" />
                                </button>
                            )}

                            {/* PDF Placeholder OR Image */}
                            {currentInvoices[currentInvoiceIndex]?.includes("application/pdf") ? (
                                <div
                                    style={{
                                        width: "auto",
                                        height: "500px",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        background: "#f5f5f5",
                                        borderRadius: 10
                                    }}
                                >
                                    <Icons.FileText size={80} color="#666" />
                                    <p style={{ marginTop: 20, fontSize: 16, color: "#666" }}>
                                        PDF Document
                                    </p>
                                    <a
                                        href={currentInvoices[currentInvoiceIndex]}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            marginTop: 10,
                                            fontSize: 14,
                                            color: "#d4af37",
                                            textDecoration: "underline",
                                            cursor: "pointer"
                                        }}
                                    >
                                        Open in new tab
                                    </a>
                                </div>
                            ) : (
                                <img
                                    src={currentInvoices[currentInvoiceIndex]}
                                    alt="Invoice"
                                    style={{
                                        borderRadius: 10,
                                        objectFit: "contain",
                                        width: "500px",
                                        height: "450px"
                                    }}
                                />
                            )}

                            {/* RIGHT ARROW */}
                            {currentInvoices.length > 1 &&
                                currentInvoiceIndex < currentInvoices.length - 1 && (
                                    <button
                                        className="invoice-nav-btn-right"
                                        onClick={handleNextInvoice}
                                    >
                                        <Icons.ChevronRight size={24} color="white" />
                                    </button>
                                )}
                        </div>

                        {/* Dots Indicator */}
                        {currentInvoices.length > 1 && (
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "center",
                                    gap: 8,
                                    marginTop: 20
                                }}
                            >
                                {currentInvoices.map((_, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => setCurrentInvoiceIndex(idx)}
                                        style={{
                                            width: idx === currentInvoiceIndex ? 24 : 8,
                                            height: 8,
                                            borderRadius: 4,
                                            background:
                                                idx === currentInvoiceIndex ? "#d4af37" : "#ccc",
                                            cursor: "pointer",
                                            transition: "0.3s"
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
