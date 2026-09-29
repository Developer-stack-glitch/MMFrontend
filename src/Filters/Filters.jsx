import React, { useState, useEffect } from "react";
import { DatePicker, Select, Popover } from "antd";
import dayjs from "dayjs";

const { Option } = Select;

export default function Filters({ onFilterChange, style }) {
    const getPresentRange = (type) => {
        const today = dayjs();
        switch (type) {
            case "today":
                return [today.startOf("day"), today.endOf("day")];
            case "yesterday":
                return [today.subtract(1, "day").startOf("day"), today.subtract(1, "day").endOf("day")];
            case "thisMonth":
                return [today.subtract(1, "month").date(26).startOf("day"), today.date(25).endOf("day")];
            case "lastMonth":
                return [today.subtract(2, "month").date(26).startOf("day"), today.subtract(1, "month").date(25).endOf("day")];
            case "thisYear":
                return [today.subtract(1, "year").month(11).date(26).startOf("day"), today.month(11).date(25).endOf("day")];
            default:
                return [today.startOf("day"), today.endOf("day")];
        }
    };

    // ✅ Load from sessionStorage or use defaults
    const getInitialState = () => {
        try {
            const saved = sessionStorage.getItem("filterState");
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    filterType: parsed.filterType || "today",
                    selectedValue: parsed.selectedValue
                        ? parsed.selectedValue.map(d => dayjs(d))
                        : getPresentRange("today")
                };
            }
        } catch (e) {
            console.error("Error loading filter state:", e);
        }
        return {
            filterType: "today",
            selectedValue: getPresentRange("today")
        };
    };

    const initialState = getInitialState();
    const [filterType, setFilterType] = useState(initialState.filterType);
    const [selectedValue, setSelectedValue] = useState(initialState.selectedValue);
    const [isOpen, setIsOpen] = useState(false);

    const handlePresetChange = (value) => {
        setFilterType(value);
        if (value !== "custom") {
            const range = getPresentRange(value);
            setSelectedValue(range);
            setIsOpen(false); // Auto-close when selecting a quick preset
        }
    };

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

    const popoverContent = (
        <div style={{ width: 280, padding: 5 }}>
            <Select
                value={filterType}
                onChange={handlePresetChange}
                style={{ width: '100%', marginBottom: filterType === "custom" ? 15 : 0 }}
            >
                <Option value="today">Today</Option>
                <Option value="yesterday">Yesterday</Option>
                <Option value="thisMonth">This Month</Option>
                <Option value="lastMonth">Last Month</Option>
                <Option value="thisYear">This Year</Option>
                <Option value="custom">Custom Range</Option>
            </Select>

            {filterType === "custom" && (
                <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: 'gray', marginBottom: 4 }}>Start date</div>
                        <DatePicker
                            format="DD/MM/YYYY"
                            value={selectedValue ? selectedValue[0] : null}
                            onChange={(d) => setSelectedValue([d, selectedValue ? selectedValue[1] : null])}
                            style={{ width: '100%' }}
                            allowClear={false}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: 'gray', marginBottom: 4 }}>End date</div>
                        <DatePicker
                            format="DD/MM/YYYY"
                            value={selectedValue ? selectedValue[1] : null}
                            onChange={(d) => setSelectedValue([selectedValue ? selectedValue[0] : null, d])}
                            style={{ width: '100%' }}
                            allowClear={false}
                        />
                    </div>
                </div>
            )}
        </div>
    );

    // const displayDate = selectedValue && selectedValue[0] && selectedValue[1]
    //     ? `${selectedValue[0].format("DD-MM-YYYY")} - ${selectedValue[1].format("DD-MM-YYYY")}`
    //     : "Select Date";

    return (
        <div className="filters-premium-container" style={style}>
            <Popover
                content={popoverContent}
                trigger="click"
                open={isOpen}
                onOpenChange={setIsOpen}
                placement="bottomLeft"
            >
                <div className="ant-input filters-picker-premium">
                    {/* <span>{displayDate}</span> */}
                    <span className="filter-start-date">
                        {selectedValue?.[0]
                            ? selectedValue[0].format("DD-MM-YYYY")
                            : "Start Date"
                        }
                    </span>
                    <span className="filter-arrow">
                        →
                    </span>
                    <span className="filter-end-date">
                        {selectedValue?.[1]
                            ? selectedValue[1].format("DD-MM-YYYY")
                            : "End Date"
                        }
                    </span>
                    <span className="filter-dropdown-arrow"> ▼ </span>
                </div>
            </Popover>
        </div>
    );
}