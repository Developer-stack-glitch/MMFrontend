import React, { useEffect, useMemo, useState } from "react";
import { Eye, Check, X } from "lucide-react";
import * as Icons from "lucide-react";
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

    const [requests, setRequests] = useState([]);

    // ✅ Details Modal
    const [showDetails, setShowDetails] = useState(false);
    const [selected, setSelected] = useState(null);

    // ✅ Load Approvals
    useEffect(() => {
        loadApprovals();
    }, []);

    const loadApprovals = async () => {
        const data = await getApprovalsApi();
        setRequests(Array.isArray(data) ? data : []);
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
            {/* ✅ FULL DASHBOARD FILTERS */}
            <Filters onFilterChange={setFilters} />

            <div className="approvals-container">

                <div className="approvals-header-top">
                    <h1 className="approvals-title">Approvals</h1>
                </div>

                {/* ✅ Extra Filters */}
                <div className="filter-dropdown">

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
                </div>

                {/* ✅ TABLE */}
                <div className="approvals-table">

                    <div className="approvals-header">
                        <span>SPENDER NAME</span>
                        <span>CATEGORY</span>
                        <span>AMOUNT</span>
                        <span>DATE</span>
                        <span>ACTION</span>
                    </div>

                    {filteredRows.length === 0 ? (
                        <div className="no-data-box">
                            <img
                                src="https://cdn-icons-png.flaticon.com/512/4076/4076503.png"
                                alt="no data"
                                className="no-data-img"
                            />
                            <h3>No Data Found</h3>
                            <p>No approval requests available.</p>
                        </div>
                    ) : (
                        filteredRows.map((row) => (
                            <div className="approvals-row" key={row.id}>
                                <div className="owner-cell">
                                    {renderIcon(row.icon)}
                                    <div>
                                        <h4>{row.name}</h4>
                                        <p>{row.role}</p>
                                    </div>
                                </div>

                                <div className="category-cell">
                                    <span
                                        className="category-pill"
                                        style={{
                                            backgroundColor:
                                                row.categoryColor || row.color,
                                        }}
                                    >
                                        {row.category}
                                    </span>
                                </div>

                                <div className="amount-cell">{fmtAmt(row.amount)}</div>
                                <div className="freq-cell">{fmtDate(row.date)}</div>

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
                            </div>
                        ))
                    )}
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
                            <div><b>Date:</b> {fmtDate(selected.date)}</div>

                            <div
                                style={{
                                    display: "flex",
                                    gap: 8,
                                    marginTop: 12,
                                    border: "none",
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
    );
}
