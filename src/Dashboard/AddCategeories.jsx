import React, { useState, useEffect, useRef } from "react";
import {
    getExpenseCategoriesApi,
    getIncomeCategoriesApi,
    safeGetLocalStorage,
    addExpenseCategoryApi,
    addIncomeCategoryApi,
    deleteExpenseCategoryApi,
    deleteIncomeCategoryApi,
    updateExpenseCategoryApi,
    updateIncomeCategoryApi,
    deleteExpenseMainCategoryApi
} from "../../Api/action";
import { Modal, Tabs, Button, Input, Select, Radio, Popconfirm } from "antd";
import { motion, AnimatePresence } from "framer-motion";
import * as Icons from "lucide-react";
import { Plus, X, Trash2, Edit, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { FullPageLoader } from "../../Common/FullPageLoader";
import { CommonToaster } from "../../Common/CommonToaster";

const { TabPane } = Tabs;

export default function AddCategories() {
    const [activeTab, setActiveTab] = useState("expenses");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedColor, setSelectedColor] = useState("#f87171");
    const [categoryName, setCategoryName] = useState("");
    const [selectedIcon, setSelectedIcon] = useState("ShoppingBag");
    const [subCategory, setSubCategory] = useState("");

    const [expenseData, setExpenseData] = useState([]);
    const [incomeData, setIncomeData] = useState([]);
    const [iconSearch, setIconSearch] = useState("");
    const [customColor, setCustomColor] = useState("");
    const colorInputRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [categoryType, setCategoryType] = useState("new"); // "new" | "existing"

    // Edit Mode State
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Expand State for Expense Groups
    const [expandedGroups, setExpandedGroups] = useState({});

    const isAdmin = safeGetLocalStorage("loginDetails", {})?.role === "admin";

    const loadCategories = React.useCallback(async () => {
        try {
            setLoading(true);
            const exp = await getExpenseCategoriesApi();
            const inc = await getIncomeCategoriesApi();

            setExpenseData(Array.isArray(exp) ? exp : []);
            setIncomeData(Array.isArray(inc) ? inc : []);

        } catch (err) {
            console.error("Failed fetching categories", err);
        }
        finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCategories();
        window.addEventListener("refreshCategories", loadCategories);
        return () => {
            window.removeEventListener("refreshCategories", loadCategories);
        };
    }, [loadCategories]);

    // Grouping Logic
    const groupedExpenses = React.useMemo(() => {
        return expenseData.reduce((acc, curr) => {
            const main = curr.main_category;
            if (!acc[main]) acc[main] = [];
            acc[main].push(curr);
            return acc;
        }, {});
    }, [expenseData]);

    const toggleGroup = (mainCat) => {
        setExpandedGroups(prev => ({ ...prev, [mainCat]: !prev[mainCat] }));
    };

    // Colors
    const colors = ["#ef4444", "#f97316", "#facc15", "#4ade80", "#22d3ee", "#6366f1", "#a855f7"];

    // Icons
    const allIcons = Object.keys(Icons)
        .filter((n) => /^[A-Z]/.test(n))
        .slice(0, 800);

    const filteredIcons = allIcons.filter((icon) =>
        icon.toLowerCase().includes(iconSearch.toLowerCase())
    );

    const renderIcon = (iconName, size = 20, color = "#fff") => {
        const IconComponent = Icons[iconName];
        return IconComponent ? <IconComponent size={size} color={color} /> : null;
    };

    const handleOpenCreate = () => {
        setIsEditMode(false);
        setEditingId(null);
        setCategoryName("");
        setSubCategory("");
        setSelectedColor("#f87171");
        setSelectedIcon("ShoppingBag");
        setCategoryType("new");
        setIsModalOpen(true);
    };

    const handleOpenEdit = (item, type) => {
        setIsEditMode(true);
        setEditingId(item.id);
        setSelectedColor(item.color || "#f87171");
        setSelectedIcon(item.icon || "ShoppingBag");

        if (type === "expense") {
            setCategoryName(item.main_category);
            setSubCategory(item.sub_category);
            setCategoryType("existing");
        } else {
            setCategoryName(item.name);
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!categoryName.trim()) return CommonToaster("Enter category name", "error");

        try {
            if (activeTab === "expenses") {
                if (!subCategory.trim()) return CommonToaster("Enter sub category", "error");

                const payload = {
                    mainCategory: categoryName,
                    subCategory,
                    color: selectedColor,
                    icon: selectedIcon,
                };

                if (isEditMode) {
                    await updateExpenseCategoryApi(editingId, payload);
                    CommonToaster("Category updated successfully", "success");
                } else {
                    await addExpenseCategoryApi(payload);
                    CommonToaster("Category created successfully", "success");
                }
            } else {
                const payload = {
                    name: categoryName,
                    color: selectedColor,
                    icon: selectedIcon,
                };

                if (isEditMode) {
                    await updateIncomeCategoryApi(editingId, payload);
                    CommonToaster("Category updated successfully", "success");
                } else {
                    await addIncomeCategoryApi(payload);
                    CommonToaster("Category created successfully", "success");
                }
            }

            setIsModalOpen(false);
            window.dispatchEvent(new Event("refreshCategories"));
        } catch (err) {
            console.error(err);
            CommonToaster(isEditMode ? "Failed to update category" : "Failed to add category", "error");
        }
    };

    // DELETE HANDLERS
    const handleDeleteSub = async (id, type) => {
        try {
            if (type === "expense") {
                await deleteExpenseCategoryApi(id, false);
            } else {
                await deleteIncomeCategoryApi(id);
            }
            CommonToaster("Category deleted", "success");
            loadCategories();
        } catch (e) {
            CommonToaster("Failed to delete", "error");
        }
    };

    // DELETE MAIN CATEGORY STATE
    const [deleteModal, setDeleteModal] = useState({ open: false, category: null });

    const handleDeleteMain = (mainCat) => {
        setDeleteModal({ open: true, category: mainCat });
    };

    const confirmDeleteMain = async () => {
        try {
            if (!deleteModal.category) return;
            await deleteExpenseMainCategoryApi(deleteModal.category);
            CommonToaster("Main category and all sub-categories deleted!", "success");
            loadCategories();
            setDeleteModal({ open: false, category: null });
        } catch (e) {
            CommonToaster("Failed to delete", "error");
        }
    };

    return (
        <>
            {loading ? (<FullPageLoader />) : (
                <div className="categories-container">
                    <div className="categories-header">
                        <h2>Manage Categories</h2>
                        <p className="subtitle">Organize and personalize your spending categories</p>
                    </div>

                    <motion.div
                        initial="hidden"
                        animate="visible" className="categories-tabs">
                        <Tabs activeKey={activeTab} onChange={setActiveTab} centered className="custom-tabs">

                            {/* ✅ EXPENSES TAB */}
                            <TabPane tab="Expenses" key="expenses">
                                <div className="category-list-grouped" style={{ paddingBottom: 20 }}>
                                    {Object.entries(groupedExpenses).length === 0 && (
                                        <div style={{ textAlign: "center", marginTop: 20, color: "#888" }}>
                                            No expense categories found.
                                        </div>
                                    )}

                                    {Object.entries(groupedExpenses).map(([mainCat, items]) => (
                                        <div key={mainCat} className="category-group-card" style={{
                                            marginBottom: 15,
                                            background: "#fff",
                                            borderRadius: 12,
                                            padding: "10px 15px",
                                            boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
                                            border: "1px solid #f0f0f0"
                                        }}>
                                            {/* GROUP HEADER */}
                                            <div className="group-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                <div
                                                    onClick={() => toggleGroup(mainCat)}
                                                    style={{ display: "flex", alignItems: "center", cursor: "pointer", gap: 10, flex: 1 }}
                                                >
                                                    {expandedGroups[mainCat] ? <ChevronDown size={18} color="#666" /> : <ChevronRight size={18} color="#666" />}
                                                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#333" }}>{mainCat}</h3>
                                                    <span style={{ fontSize: 12, color: "#999", marginLeft: 5 }}>({items.length})</span>
                                                </div>

                                                {isAdmin && (
                                                    <Button
                                                        type="text"
                                                        danger
                                                        size="small"
                                                        icon={<Trash2 size={16} />}
                                                        onClick={() => handleDeleteMain(mainCat)}
                                                        title="Delete Main Category"
                                                    />
                                                )}
                                            </div>

                                            {/* GROUP ITEMS (Sub Categories) */}
                                            <AnimatePresence>
                                                {expandedGroups[mainCat] && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: "auto" }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        style={{ marginTop: 10, paddingLeft: 28 }}
                                                    >
                                                        {items.map((cat, index) => (
                                                            <div key={cat.id || index} className="sub-category-item" style={{
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "space-between",
                                                                padding: "8px 0",
                                                                borderBottom: index === items.length - 1 ? "none" : "1px solid #f9f9f9"
                                                            }}>
                                                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                                    <div
                                                                        className="category-icon"
                                                                        style={{
                                                                            background: cat.color,
                                                                            width: 30,
                                                                            height: 30,
                                                                            display: "flex",
                                                                            alignItems: "center",
                                                                            justifyContent: "center",
                                                                            borderRadius: 8,
                                                                            color: "white"
                                                                        }}
                                                                    >
                                                                        {renderIcon(cat.icon, 16)}
                                                                    </div>
                                                                    <span style={{ fontSize: 14, fontWeight: 500, color: "#444" }}>{cat.sub_category}</span>
                                                                </div>

                                                                {isAdmin && (
                                                                    <div style={{ display: "flex", gap: 5 }}>
                                                                        <Button
                                                                            type="text"
                                                                            size="small"
                                                                            icon={<Edit size={14} color="#d4af37" />}
                                                                            onClick={() => handleOpenEdit(cat, "expense")}
                                                                        />
                                                                        <Popconfirm
                                                                            title="Delete Sub Category?"
                                                                            description="Are you sure?"
                                                                            onConfirm={() => handleDeleteSub(cat.id, "expense")}
                                                                            okText="Yes"
                                                                            cancelText="No"
                                                                        >
                                                                            <Button
                                                                                type="text"
                                                                                size="small"
                                                                                danger
                                                                                icon={<Trash2 size={14} />}
                                                                            />
                                                                        </Popconfirm>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    ))}
                                </div>
                            </TabPane>

                            {/* ✅ INCOME TAB */}
                            <TabPane tab="Income" key="income">
                                <div className="category-list">
                                    {incomeData.map((cat, index) => (
                                        <div key={index} className="category-item premium" style={{ justifyContent: 'space-between' }}>
                                            <div className="category-left">
                                                <div
                                                    className="category-icon"
                                                    style={{ background: cat.color }}
                                                >
                                                    {renderIcon(cat.icon, 18)}
                                                </div>
                                                <div>
                                                    <h4>{cat.name}</h4>
                                                    <p>Income Source</p>
                                                </div>
                                            </div>
                                            {isAdmin && (
                                                <div style={{ display: "flex", gap: 5 }}>
                                                    <Button
                                                        type="text"
                                                        size="small"
                                                        icon={<Edit size={16} color="#d4af37" />}
                                                        onClick={() => handleOpenEdit(cat, "income")}
                                                    />
                                                    <Popconfirm
                                                        title="Delete Category?"
                                                        description="Are you sure?"
                                                        onConfirm={() => handleDeleteSub(cat.id, "income")}
                                                        okText="Yes"
                                                        cancelText="No"
                                                    >
                                                        <Button
                                                            type="text"
                                                            size="small"
                                                            danger
                                                            icon={<Trash2 size={16} />}
                                                        />
                                                    </Popconfirm>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </TabPane>
                        </Tabs>
                    </motion.div>

                    {/* ✅ Add button */}
                    {isAdmin && (
                        <div className="categories-footer">
                            <Button
                                icon={<Plus size={16} />}
                                onClick={handleOpenCreate}
                                className="add-btn-premium"
                            >
                                Add New Category
                            </Button>
                        </div>
                    )}

                    {/* ✅ CREATE / EDIT CATEGORY MODAL */}
                    <Modal
                        open={isModalOpen}
                        onCancel={() => setIsModalOpen(false)}
                        footer={null}
                        width={480}
                        centered
                        className="create-category-modal"
                        closeIcon={<X size={20} />}
                    >
                        <h3 className="modal-title">{isEditMode ? "Edit Category" : "Create New Category"}</h3>
                        <p className="modal-subtitle">
                            {isEditMode ? "Update category details." : "Choose color and icon to make it stand out."}
                        </p>

                        {activeTab === "expenses" ? (
                            <div style={{ marginBottom: 5 }}>
                                <Radio.Group
                                    className="radio-group"
                                    value={categoryType}
                                    onChange={(e) => {
                                        setCategoryType(e.target.value);
                                        // clear main category name if switching to new, unless editing
                                        if (!isEditMode) setCategoryName("");
                                    }}
                                    style={{ marginBottom: 10 }}
                                    disabled={isEditMode} // Lock type in edit mode? OR allow change? Let's just lock for simplicity or allow input updates.
                                >
                                    <Radio value="new" disabled={isEditMode}>Main Category Name</Radio>
                                    {!isEditMode && <Radio value="existing">Existing Main Category</Radio>}
                                </Radio.Group>

                                {categoryType === "existing" && !isEditMode ? (
                                    <Select
                                        placeholder="Select Main Category"
                                        style={{ width: "100%", height: 40 }}
                                        onChange={(value) => setCategoryName(value)}
                                        value={categoryName || undefined}
                                        showSearch
                                    >
                                        {[...new Set(expenseData.map((item) => item.main_category).filter(Boolean))].map(
                                            (cat) => (
                                                <Select.Option key={cat} value={cat}>
                                                    {cat}
                                                </Select.Option>
                                            )
                                        )}
                                    </Select>
                                ) : (
                                    <Input
                                        placeholder="Main category name"
                                        value={categoryName}
                                        onChange={(e) => setCategoryName(e.target.value)}
                                        className="category-input"
                                    />
                                )}
                            </div>
                        ) : (
                            <Input
                                placeholder="Income category name"
                                value={categoryName}
                                onChange={(e) => setCategoryName(e.target.value)}
                                className="category-input"
                            />
                        )}

                        {activeTab === "expenses" && (
                            <Input
                                placeholder="Sub category name"
                                value={subCategory}
                                onChange={(e) => setSubCategory(e.target.value)}
                                className="category-input"
                                style={{ marginTop: 10 }}
                            />
                        )}

                        {/* ✅ Color Picker */}
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

                                {/* ✅ Custom Color Picker */}
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

                                {/* Hidden Color Input */}
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

                        {/* ✅ Icon Picker (AUTO-GENERATED) */}
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
                            <div className="icon-grid">
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
                        <Button type="primary" className="create-btn" onClick={handleSubmit}>
                            {isEditMode ? "Update Category" : "Create Category"}
                        </Button>
                    </Modal>

                    {/* ✅ DELETE CONFIRMATION MODAL */}
                    <Modal
                        open={deleteModal.open}
                        title={
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#cf1322' }}>
                                <AlertTriangle size={20} />
                                <span>Delete Main Category?</span>
                            </div>
                        }
                        onCancel={() => setDeleteModal({ open: false, category: null })}
                        footer={[
                            <Button key="cancel" onClick={() => setDeleteModal({ open: false, category: null })}>
                                Cancel
                            </Button>,
                            <Button key="delete" type="primary" className="delete-all-btn" danger onClick={confirmDeleteMain}>
                                Yes, Delete All
                            </Button>
                        ]}
                        centered
                    >
                        <p style={{ fontSize: 16 }}>
                            You are about to delete <strong>{deleteModal.category}</strong>.
                        </p>
                        <p style={{ color: '#666' }}>
                            This will also delete the main category and <strong>all its sub-categories</strong>. This action cannot be undone.
                        </p>
                    </Modal>
                </div>
            )}
        </>
    );
}
