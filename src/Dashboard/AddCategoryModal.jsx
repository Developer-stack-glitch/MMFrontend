import React, { useState, useRef, useEffect } from "react";
import { Modal, Button, Input, Select, Radio } from "antd";
import * as Icons from "lucide-react";
import { X } from "lucide-react";
import { addExpenseCategoryApi } from "../../Api/action";
import { CommonToaster } from "../../Common/CommonToaster";

export default function AddCategoryModal({
    open,
    onClose,
    initialMainCategory = "",
    existingCategories = [], // Array of main category names
    onSuccess
}) {
    const [categoryType, setCategoryType] = useState("new"); // "new" | "existing"
    const [mainCategory, setMainCategory] = useState("");
    const [subCategory, setSubCategory] = useState("");
    const [selectedColor, setSelectedColor] = useState("#f87171");
    const [customColor, setCustomColor] = useState("");
    const [selectedIcon, setSelectedIcon] = useState("ShoppingBag");
    const [iconSearch, setIconSearch] = useState("");
    const colorInputRef = useRef(null);

    // Initial setup
    useEffect(() => {
        if (open) {
            if (initialMainCategory) {
                setCategoryType("existing");
                setMainCategory(initialMainCategory);
            } else {
                setCategoryType("new");
                setMainCategory("");
            }
            setSubCategory("");
            setSelectedColor("#f87171");
            setSelectedIcon("ShoppingBag");
            setCustomColor("");
            setIconSearch("");
        }
    }, [open, initialMainCategory]);

    // Colors
    const colors = ["#ef4444", "#f97316", "#facc15", "#4ade80", "#22d3ee", "#6366f1", "#a855f7"];

    // Icons
    const allIcons = Object.keys(Icons).filter((n) => /^[A-Z]/.test(n)).slice(0, 800);
    const filteredIcons = allIcons.filter((icon) =>
        icon.toLowerCase().includes(iconSearch.toLowerCase())
    );

    const renderIcon = (iconName, size = 20, color = "#fff") => {
        const IconComponent = Icons[iconName];
        return IconComponent ? <IconComponent size={size} color={color} /> : null;
    };

    const handleCreate = async () => {
        if (!mainCategory.trim()) return CommonToaster("Enter main category name", "error");
        if (!subCategory.trim()) return CommonToaster("Enter sub category name", "error");

        try {
            await addExpenseCategoryApi({
                mainCategory: mainCategory,
                subCategory,
                color: selectedColor,
                icon: selectedIcon,
            });
            CommonToaster("Category created successfully", "success");
            if (onSuccess) onSuccess(mainCategory, subCategory); // Pass back the new cat
            onClose();
            // Trigger refresh
            window.dispatchEvent(new Event("refreshCategories"));
        } catch (err) {
            console.error(err);
            CommonToaster("Failed to add category", "error");
        }
    };

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width={480}
            centered
            className="create-category-modal"
            closeIcon={<X size={20} />}
        >
            <h3 className="modal-title">Create New Expense Category</h3>
            <p className="modal-subtitle">Add a new category for your expenses.</p>

            <div style={{ marginBottom: 15 }}>
                <Radio.Group
                    className="radio-group"
                    value={categoryType}
                    onChange={(e) => {
                        setCategoryType(e.target.value);
                        setMainCategory("");
                    }}
                    style={{ marginBottom: 10 }}
                >
                    <Radio value="new">New Main Category</Radio>
                    <Radio value="existing">Existing Main Category</Radio>
                </Radio.Group>

                {categoryType === "existing" ? (
                    <Select
                        placeholder="Select Main Category"
                        style={{ width: "100%", height: 40 }}
                        onChange={(value) => setMainCategory(value)}
                        value={mainCategory || undefined}
                        showSearch
                        optionFilterProp="children"
                    >
                        {existingCategories.map((cat) => (
                            <Select.Option key={cat} value={cat}>
                                {cat}
                            </Select.Option>
                        ))}
                    </Select>
                ) : (
                    <Input
                        placeholder="Main category name"
                        value={mainCategory}
                        onChange={(e) => setMainCategory(e.target.value)}
                        className="category-input"
                    />
                )}
            </div>

            <Input
                placeholder="Sub category name"
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                className="category-input"
                style={{ marginBottom: 15 }}
            />

            {/* Color Picker */}
            <div className="color-section">
                <p>Category color</p>
                <div className="color-options">
                    {colors.map((color) => (
                        <div
                            key={color}
                            className={`color-circle ${selectedColor === color ? "selected" : ""}`}
                            style={{ background: color }}
                            onClick={() => {
                                setSelectedColor(color);
                                setCustomColor("");
                            }}
                        />
                    ))}
                    <div
                        className={`color-circle ${customColor ? "selected" : ""}`}
                        style={{
                            background: customColor || "#fff",
                            border: customColor ? "2px solid #d4af37" : "2px dashed #b9b9b9",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 20,
                            color: "#1c2431",
                        }}
                        onClick={() => colorInputRef.current.click()}
                    >
                        {!customColor && "+"}
                    </div>
                    <input
                        type="color"
                        ref={colorInputRef}
                        style={{ display: "none" }}
                        onChange={(e) => {
                            setCustomColor(e.target.value);
                            setSelectedColor(e.target.value);
                        }}
                    />
                </div>
            </div>

            {/* Icon Picker */}
            <div className="icon-section">
                <p>Category icon</p>
                <div style={{ marginBottom: 12 }}>
                    <Input
                        style={{ height: 40 }}
                        placeholder="Search icon..."
                        value={iconSearch}
                        onChange={(e) => setIconSearch(e.target.value)}
                        className="category-input"
                    />
                </div>
                <div className="icon-grid" style={{ maxHeight: 200, overflowY: 'auto' }}>
                    {filteredIcons.map((iconName) => (
                        <div
                            key={iconName}
                            className={`icon-circle ${selectedIcon === iconName ? "selected-icon" : ""}`}
                            onClick={() => setSelectedIcon(iconName)}
                        >
                            {renderIcon(iconName, 20, "#000")}
                        </div>
                    ))}
                </div>
            </div>

            <Button type="primary" className="create-btn" onClick={handleCreate} style={{ width: '100%', marginTop: 20, height: 45 }}>
                Create Category
            </Button>
        </Modal>
    );
}
