import React, { useState, useEffect, useRef } from "react";
import { getExpenseCategoriesApi, getIncomeCategoriesApi } from "../../Api/action";
import { Modal, Tabs, Button, Input, Select, Radio } from "antd";
import { motion } from "framer-motion";
import * as Icons from "lucide-react";
import { Plus, X } from "lucide-react";
import { FullPageLoader } from "../../Common/FullPageLoader";
import { addExpenseCategoryApi, addIncomeCategoryApi } from "../../Api/action";
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


    // ✅ All colors
    const colors = ["#ef4444", "#f97316", "#facc15", "#4ade80", "#22d3ee", "#6366f1", "#a855f7"];

    // ✅ Generate ALL available icon names
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

    const handleCreateCategory = async () => {
        if (!categoryName.trim()) return CommonToaster("Enter category name", "error");
        try {
            if (activeTab === "expenses") {
                if (!subCategory.trim()) return CommonToaster("Enter sub category", "error");
                await addExpenseCategoryApi({
                    mainCategory: categoryName,
                    subCategory,
                    color: selectedColor,
                    icon: selectedIcon,
                });
            } else {
                await addIncomeCategoryApi({
                    name: categoryName,
                    color: selectedColor,
                    icon: selectedIcon,
                });
            }
            CommonToaster("Category created", "success");
            setIsModalOpen(false);
            setCategoryName("");
            setSubCategory("");
            setSelectedIcon("ShoppingBag");
            setCategoryType("new");
            window.dispatchEvent(new Event("refreshCategories"));
        } catch (err) {
            console.error(err);
            CommonToaster("Failed to add category", "error");
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
                            {/* ✅ EXPENSES */}
                            <TabPane tab="Expenses" key="expenses">
                                <div className="category-list">
                                    {expenseData.map((cat, index) => (
                                        <div key={index} className="category-item premium">
                                            <div className="category-left">
                                                <div
                                                    className="category-icon"
                                                    style={{ background: cat.color }}
                                                >
                                                    {renderIcon(cat.icon, 18)}
                                                </div>
                                                <div>
                                                    <h4>{cat.sub_category}</h4>
                                                    <p>0 transactions</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </TabPane>

                            {/* ✅ INCOME */}
                            <TabPane tab="Income" key="income">
                                <div className="category-list">
                                    {incomeData.map((cat, index) => (
                                        <div key={index} className="category-item premium">
                                            <div className="category-left">
                                                <div
                                                    className="category-icon"
                                                    style={{ background: cat.color }}
                                                >
                                                    {renderIcon(cat.icon, 18)}
                                                </div>
                                                <div>
                                                    <h4>{cat.name}</h4>
                                                    <p>0 transactions</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </TabPane>
                        </Tabs>
                    </motion.div>

                    {/* ✅ Add button */}
                    <div className="categories-footer">
                        <Button
                            icon={<Plus size={16} />}
                            onClick={() => setIsModalOpen(true)}
                            className="add-btn-premium"
                        >
                            Add New Category
                        </Button>
                    </div>

                    {/* ✅ CREATE CATEGORY MODAL */}
                    <Modal
                        open={isModalOpen}
                        onCancel={() => setIsModalOpen(false)}
                        footer={null}
                        width={480}
                        centered
                        className="create-category-modal"
                        closeIcon={<X size={20} />}
                    >
                        <h3 className="modal-title">Create a New Category</h3>
                        <p className="modal-subtitle">Choose color and icon to make it stand out.</p>
                        {activeTab === "expenses" ? (
                            <div style={{ marginBottom: 5 }}>
                                <Radio.Group
                                    className="radio-group"
                                    value={categoryType}
                                    onChange={(e) => {
                                        setCategoryType(e.target.value);
                                        setCategoryName("");
                                    }}
                                >
                                    <Radio value="new">New Main Category</Radio>
                                    <Radio value="existing">Existing Main Category</Radio>
                                </Radio.Group>
                                {categoryType === "existing" ? (
                                    <Select
                                        placeholder="Select Main Category"
                                        style={{ width: "100%", height: 40 }}
                                        onChange={(value) => setCategoryName(value)}
                                        value={categoryName || undefined}
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
                        <Button type="primary" className="create-btn" onClick={handleCreateCategory}>
                            Create Category
                        </Button>
                    </Modal>
                </div>
            )}
        </>
    );
}
