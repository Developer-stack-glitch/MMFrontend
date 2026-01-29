import React, { useEffect, useMemo, useState } from "react";
import { Eye, Check, X } from "lucide-react";
import * as Icons from "lucide-react";
import { motion } from "framer-motion";
import { Select, Button, Modal, Popconfirm, Tooltip, Pagination } from "antd";
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
import InvoicePreviewModal from "../Common/InvoicePreviewModal";
import ApprovalsSkeleton from "./ApprovalsSkeleton";


export default function Approvals() {
    const [filters, setFilters] = useState({
        filterType: "year",
        compareMode: false,
        value: dayjs(),
    });
    const [filterCategory, setFilterCategory] = useState("All");
    const [filterAmount, setFilterAmount] = useState("");
    const [searchText, setSearchText] = useState("");
    const [loading, setLoading] = useState(true)
    const [requests, setRequests] = useState([]);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    // Invoice Modal
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [currentInvoices, setCurrentInvoices] = useState([]);
    // ✅ Details Modal
    const [showDetails, setShowDetails] = useState(false);
    const [selected, setSelected] = useState(null);

    // ✅ Load Approvals
    useEffect(() => {
        loadApprovals();
        window.addEventListener("incomeExpenseUpdated", loadApprovals);
        window.addEventListener("summaryUpdated", loadApprovals);
        window.addEventListener("newApprovalsReceived", loadApprovals);
        return () => {
            window.removeEventListener("incomeExpenseUpdated", loadApprovals);
            window.removeEventListener("summaryUpdated", loadApprovals);
            window.removeEventListener("newApprovalsReceived", loadApprovals);
        };
    }, [page, pageSize, filters]);

    useEffect(() => {
        setPage(1);
    }, [filters]);

    const loadApprovals = async () => {
        setLoading(true)
        const { startDate, endDate } = getDateRange(filters);
        const response = await getApprovalsApi(page, pageSize, { startDate, endDate });
        if (response && response.data && Array.isArray(response.data)) {
            setRequests(response.data);
            setTotal(response.total || 0);
        } else if (Array.isArray(response)) {
            setRequests(response);
            setTotal(response.length);
        } else {
            setRequests([]);
            setTotal(0);
        }
        setLoading(false)
    };

    // ✅ Helper
    const fmtDate = (d) => (d ? dayjs(d).format("DD/MM/YYYY") : "-");
    const fmtAmt = (n) => {
        const val = Number(String(n ?? 0).replace(/[^0-9.-]+/g, "")) || 0;
        return `₹${val.toLocaleString('en-IN')}`;
    };

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

            CommonToaster("Approved and added to wallet!", "success");
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

    const getDateRange = (f) => {
        if (!f.value) return { startDate: null, endDate: null };
        const type = f.filterType;
        let start, end;

        if (!f.compareMode) {
            start = dayjs(f.value).startOf(type).format("YYYY-MM-DD");
            end = dayjs(f.value).endOf(type).format("YYYY-MM-DD");
        } else {
            if (!Array.isArray(f.value) || f.value.length !== 2)
                return { startDate: null, endDate: null };
            start = dayjs(f.value[0]).startOf('day').format("YYYY-MM-DD");
            end = dayjs(f.value[1]).endOf('day').format("YYYY-MM-DD");
        }
        return { startDate: start, endDate: end };
    };

    // ✅ Extract categories from Requests
    const categoryOptions = useMemo(() => {
        const set = new Set();
        requests.forEach((r) => r?.sub_category && set.add(r.sub_category));
        return ["All", ...Array.from(set)];
    }, [requests]);


    // ✅ ✅ ✅ APPLY DATE FILTER (From Dashboard)
    const applyFilters = (items) => {
        if (!filters.value) return items;
        const type = filters.filterType;
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
    const handleViewInvoice = (invoiceData) => {
        if (!invoiceData) return;
        const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
        let invoicesArray = [];
        const normalizeEntry = (entry) => {
            if (!entry) return null;
            let str = String(entry).trim();
            str = str.replace(/^"+|"+$/g, "");
            // If it's a base64 data URL, return as-is
            if (str.startsWith("data:")) {
                return str;
            }

            // If it already starts with /uploads/invoices/, just prepend API_BASE
            if (str.startsWith("/uploads/invoices/")) {
                return `${API_BASE}${str}`;
            }

            // Otherwise, construct the full path
            return `${API_BASE}/uploads/invoices/${str}`;
        };
        if (Array.isArray(invoiceData)) {
            invoicesArray = invoiceData
                .map(normalizeEntry)
                .filter(Boolean);
        }
        else if (typeof invoiceData === "string" && invoiceData.trim().startsWith("[")) {
            try {
                const parsed = JSON.parse(invoiceData);
                if (Array.isArray(parsed)) {
                    invoicesArray = parsed
                        .map(normalizeEntry)
                        .filter(Boolean);
                }
            } catch (e) {
            }
        }
        if (!invoicesArray.length) {
            invoicesArray = [normalizeEntry(invoiceData)].filter(Boolean);
        }
        if (!invoicesArray.length) return;
        setCurrentInvoices(invoicesArray);
        setShowInvoiceModal(true);
    };

    let filteredRows = applyFilters(requests);
    if (searchText.trim()) {
        filteredRows = filteredRows.filter((r) =>
            `${r.name} ${r.sub_category} ${r.branch} ${fmtDate(r.date)}`
                .toLowerCase()
                .includes(searchText.toLowerCase())
        );
    }
    if (filterCategory !== "All") {
        filteredRows = filteredRows.filter((r) => r.sub_category === filterCategory);
    }
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
        if (MaybeIcon) return <MaybeIcon size={20} color="#fff" />;
        return <img src={iconVal} style={{ width: 20, height: 20, objectFit: 'contain' }} alt="" />;
    };

    const totalFilteredAmount = filteredRows.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

    return (
        <>
            <Filters onFilterChange={setFilters} />
            {loading ? (<ApprovalsSkeleton />) : (
                <div className="approvals-container">
                    <div className="approvals-header-top">
                        <h1 className="approvals-title">Approvals</h1>
                    </div>

                    {/* FILTER UI */}
                    <div className="filter-card">
                        <div className="filter-left">
                            <div className="search-wrapper">
                                <Icons.Search size={16} className="search-icon" />
                                <input
                                    type="text"
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    placeholder="Search owner, category..."
                                />
                            </div>

                            <div className="select-wrapper">
                                <Select
                                    value={filterCategory}
                                    onChange={setFilterCategory}
                                    style={{ width: 160 }}
                                    placeholder="Category"
                                    suffixIcon={<Icons.LayoutGrid size={14} />}
                                    options={categoryOptions.map((c) => ({
                                        value: c,
                                        label: c === "All" ? "Category: All" : c,
                                    }))}
                                />
                            </div>

                            <div className="select-wrapper">
                                <Select
                                    value={filterAmount}
                                    onChange={setFilterAmount}
                                    style={{ width: 150 }}
                                    placeholder="Amount"
                                    suffixIcon={<Icons.ArrowUpDown size={14} />}
                                    options={[
                                        { value: "", label: "Amount: All" },
                                        { value: "low", label: "Low → High" },
                                        { value: "high", label: "High → Low" },
                                    ]}
                                />
                            </div>

                            {(filterCategory !== "All" || filterAmount !== "" || searchText) && (
                                <button className="clear-filter-btn" onClick={clearAllFilters}>
                                    <Icons.X size={14} /> Clear
                                </button>
                            )}
                        </div>

                        {/* TOTAL STAT */}
                        <div className="total-stat-box is-approved">
                            <span>Total Value</span>
                            <strong className="total-amount">{fmtAmt(totalFilteredAmount)}</strong>
                        </div>
                    </div>

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
                                    <th>DESCRIPTION</th>
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
                                        <td colSpan="9">
                                            <div className="no-data-box" style={{ textAlign: "center", padding: "40px 0" }}>
                                                <img
                                                    src="https://cdn-icons-png.flaticon.com/512/4076/4076503.png"
                                                    alt="no data"
                                                    className="no-data-img"
                                                />
                                                <h3>No Data Found</h3>
                                                <p>No approval requests available.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRows.map((row) => (
                                        <tr key={row.id} className="table-row">
                                            {/* 1️⃣ SPENDER NAME */}
                                            <td>
                                                <div className="owner-cell">
                                                    <div
                                                        className="icon-circles"
                                                        style={{
                                                            backgroundColor: row.categoryColor || row.color || "#d4af37",
                                                            width: 40,
                                                            height: 40,
                                                            borderRadius: "50%",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            minWidth: 40,
                                                        }}
                                                    >
                                                        {renderIcon(row.icon)}
                                                    </div>
                                                    <div>
                                                        <h4>{row.name}</h4>
                                                        <p style={{ textTransform: 'uppercase', fontSize: '12px', color: "#2a2a2a" }}>{row.branch}</p>
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
                                                        {row.sub_category}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* 3️⃣ DESCRIPTION */}
                                            <td>
                                                <div className="description-cell">
                                                    {row.description || row.role || "-"}
                                                </div>
                                            </td>
                                            {/* 4️⃣ AMOUNT */}
                                            <td>
                                                {fmtAmt(row.amount)}<br></br>
                                                {Boolean(row.original_expense_id || row.is_edit) && (
                                                    <span className="editable-pill">
                                                        Editable
                                                    </span>
                                                )}
                                            </td>
                                            {/* 5️⃣ INVOICE */}
                                            <td>
                                                {row.invoice && String(row.invoice).trim() !== "" && String(row.invoice).trim() !== "[]" ? (
                                                    <button
                                                        className="view-invoice-btn"
                                                        onClick={() =>
                                                            handleViewInvoice(row.invoice)
                                                        }
                                                    >
                                                        View
                                                    </button>
                                                ) : (
                                                    <span className="no-invoice">No Invoice</span>
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

                    {/* PAGINATION */}
                    {total > 0 && (
                        <div className="pagination-wrapper" style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 0', alignItems: 'center', gap: '20px' }}>
                            <div className="rows-per-page-container">
                                Rows per page:
                                <Select
                                    value={pageSize}
                                    onChange={(v) => {
                                        setPageSize(v);
                                        setPage(1);
                                    }}
                                    size="small"
                                    className="rows-per-page-select"
                                    style={{ width: 70 }}
                                    options={[
                                        { value: 10, label: '10' },
                                        { value: 25, label: '25' },
                                        { value: 50, label: '50' },
                                        { value: 100, label: '100' },
                                    ]}
                                />
                            </div>
                            <Pagination
                                current={page}
                                onChange={(p) => setPage(p)}
                                total={total}
                                pageSize={pageSize}
                                showSizeChanger={false}
                            />
                        </div>
                    )}

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
                                <div className="text-truncate11"><b>Description:</b> {selected.role || "-"}</div>
                                <div><b>Branch:</b> {selected.branch || "-"}</div>
                                <div><b>Category:</b> {selected.sub_category}</div>
                                <div><b>Amount:</b> {fmtAmt(selected.amount)}</div>
                                <div><b>Request Date:</b> {fmtDate(selected.date)}</div>
                                <div><b>End Date:</b> {fmtDate(selected.end_date)}</div>
                                <div><b>GST:</b> {selected.gst}</div>
                                <div><b>Transaction From:</b> {selected.transaction_from}</div>
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
            )}
            {showInvoiceModal && currentInvoices.length > 0 && (
                <InvoicePreviewModal
                    open={showInvoiceModal}
                    onClose={() => setShowInvoiceModal(false)}
                    invoices={currentInvoices}
                />
            )}
        </>
    );
}
