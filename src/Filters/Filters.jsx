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
                    selectedValue: parsed.selectedValue
                        ? (Array.isArray(parsed.selectedValue)
                            ? parsed.selectedValue.map(d => dayjs(d))
                            : [dayjs(parsed.selectedValue).startOf(parsed.filterType || "year"), dayjs(parsed.selectedValue).endOf(parsed.filterType || "year")])
                        : [dayjs().startOf("year"), dayjs().endOf("year")]
                };
            }
        } catch (e) {
            console.error("Error loading filter state:", e);
        }
        return {
            filterType: "year",
            selectedValue: [dayjs().startOf("year"), dayjs().endOf("year")]
        };
    };

    const initialState = getInitialState();
    const [filterType, setFilterType] = useState(initialState.filterType);
    const [selectedValue, setSelectedValue] = useState(initialState.selectedValue);

    // ✅ Save to sessionStorage whenever filters change
    useEffect(() => {
        try {
            const stateToSave = {
                filterType,
                selectedValue: Array.isArray(selectedValue)
                    ? selectedValue.map(d => d?.format?.("YYYY-MM-DD"))
                    : selectedValue?.format?.("YYYY-MM-DD")
            };
            sessionStorage.setItem("filterState", JSON.stringify(stateToSave));
        } catch (e) {
            console.error("Error saving filter state:", e);
        }
    }, [filterType, selectedValue]);

    // Notify parent component
    useEffect(() => {
        if (onFilterChange) {
            onFilterChange({
                filterType,
                compareMode: false,
                value: selectedValue,
            });
        }
    }, [filterType, selectedValue]);

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

                            // ✅ AUTO SELECT CURRENT PERIOD RANGE
                            let start, end;
                            if (type === "month") {
                                // Custom Business Month: 26th of prev to 25th of current
                                start = dayjs().subtract(1, "month").date(26).startOf("day");
                                end = dayjs().date(25).endOf("day");
                            } else {
                                start = dayjs().startOf(type);
                                end = dayjs().endOf(type);
                            }
                            setSelectedValue([start, end]);
                        }}
                    >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                ))}
            </div>

            {/* MAIN PICKER */}
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

        </div>
    );
}
