import React, { useState, useEffect } from "react";
import { DatePicker } from "antd";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

export default function Filters({ onFilterChange, style }) {
    // ✅ Load from sessionStorage or use defaults
    const getInitialState = () => {
        try {
            const saved = sessionStorage.getItem("filterState");
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    filterType: parsed.filterType || "year",
                    compareMode: parsed.compareMode || false,
                    selectedValue: parsed.selectedValue
                        ? (Array.isArray(parsed.selectedValue)
                            ? parsed.selectedValue.map(d => dayjs(d))
                            : dayjs(parsed.selectedValue))
                        : dayjs()
                };
            }
        } catch (e) {
            console.error("Error loading filter state:", e);
        }
        return {
            filterType: "year",
            compareMode: false,
            selectedValue: dayjs()
        };
    };

    const initialState = getInitialState();
    const [filterType, setFilterType] = useState(initialState.filterType);
    const [compareMode, setCompareMode] = useState(initialState.compareMode);
    const [selectedValue, setSelectedValue] = useState(initialState.selectedValue);

    // ✅ Save to sessionStorage whenever filters change
    useEffect(() => {
        try {
            const stateToSave = {
                filterType,
                compareMode,
                selectedValue: Array.isArray(selectedValue)
                    ? selectedValue.map(d => d?.format?.("YYYY-MM-DD"))
                    : selectedValue?.format?.("YYYY-MM-DD")
            };
            sessionStorage.setItem("filterState", JSON.stringify(stateToSave));
        } catch (e) {
            console.error("Error saving filter state:", e);
        }
    }, [filterType, compareMode, selectedValue]);

    // Notify parent component
    useEffect(() => {
        if (onFilterChange) {
            onFilterChange({
                filterType,
                compareMode,
                value: selectedValue,
            });
        }
    }, [filterType, compareMode, selectedValue]);

    return (
        <div className="filters-premium-container" style={style}>

            {/* FILTER TABS */}
            <div className="filter-type-tabs">
                {["date", "week", "month", "year"].map((type) => (
                    <button
                        key={type}
                        className={`filter-tab ${filterType === type ? "active" : ""}`}
                        onClick={() => {
                            setFilterType(type);

                            // ✅ AUTO SELECT CURRENT PERIOD
                            if (type === "date") setSelectedValue(dayjs());            // today
                            if (type === "week") setSelectedValue(dayjs());            // this week
                            if (type === "month") setSelectedValue(dayjs());           // this month
                            if (type === "year") setSelectedValue(dayjs());            // this year
                        }}
                    >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                ))}
            </div>

            {/* MAIN PICKER — hidden in compare mode */}
            {!compareMode && (
                <>
                    {filterType === "date" && (
                        <DatePicker
                            className="filters-picker-premium"
                            format="DD MMM YYYY"
                            value={selectedValue}
                            onChange={setSelectedValue}
                        />
                    )}

                    {filterType === "week" && (
                        <DatePicker
                            picker="week"
                            className="filters-picker-premium"
                            value={selectedValue}
                            onChange={setSelectedValue}
                        />
                    )}

                    {filterType === "month" && (
                        <DatePicker
                            picker="month"
                            className="filters-picker-premium"
                            value={selectedValue}
                            onChange={setSelectedValue}
                        />
                    )}

                    {filterType === "year" && (
                        <DatePicker
                            picker="year"
                            className="filters-picker-premium"
                            value={selectedValue}
                            onChange={setSelectedValue}
                        />
                    )}
                </>
            )}

            {/* COMPARE TOGGLE */}
            <div className="compare-premium-toggle">
                <input
                    type="checkbox"
                    id="compare_toggle"
                    checked={compareMode}
                    onChange={(e) => {
                        setCompareMode(e.target.checked);
                        setSelectedValue(null);
                    }}
                />
                <label htmlFor="compare_toggle">Compare</label>
            </div>

            {/* COMPARE MODE */}
            {compareMode && (
                <>
                    {filterType === "date" && (
                        <RangePicker
                            className="filters-picker-premium"
                            format="DD MMM YYYY"
                            value={selectedValue}
                            onChange={setSelectedValue}
                        />
                    )}

                    {filterType === "week" && (
                        <RangePicker
                            picker="week"
                            className="filters-picker-premium"
                            value={selectedValue}
                            onChange={setSelectedValue}
                        />
                    )}

                    {filterType === "month" && (
                        <RangePicker
                            picker="month"
                            className="filters-picker-premium"
                            value={selectedValue}
                            onChange={setSelectedValue}
                        />
                    )}

                    {filterType === "year" && (
                        <RangePicker
                            picker="year"
                            className="filters-picker-premium"
                            value={selectedValue}
                            onChange={setSelectedValue}
                        />
                    )}
                </>
            )}

        </div>
    );
}
