import React, { useState, useEffect } from "react";
import { Modal, Input, Select, Button, Dropdown, Menu, Space, Radio, message } from "antd";
import { DownOutlined } from "@ant-design/icons";
import {
    getTransactionActionCategoriesApi,
    getBranchesApi,
    getUsersApi,
    getVendorsApi,
    addVendorApi,
    addTransactionActionApi,
    updateTransactionActionApi,
    createCashTransactionActionApi,
    updateCashTransactionActionApi
} from "../../Api/action";

export default function TransactionActionModal({
    open,
    onClose,
    record,
    isCash,
    onActionUpdate
}) {
    const existingAction = record?.action || null;

    const [mainCategory, setMainCategory] = useState("Select Main Category");
    const [subCategory, setSubCategory] = useState("Select Category");
    const [branch, setBranch] = useState("Select Branch");
    const [description, setDescription] = useState("");
    const [spendMode, setSpendMode] = useState("Select Spend Mode");
    const [transactionTo, setTransactionTo] = useState("");
    const [gst, setGst] = useState("No");
    const [vendorType, setVendorType] = useState("Regular");
    const [vendorGst, setVendorGst] = useState("");

    const [actionCategories, setActionCategories] = useState({});
    const [branchList, setBranchList] = useState([]);
    const [vendorList, setVendorList] = useState([]);
    const [usersList, setUsersList] = useState([]);

    const [saving, setSaving] = useState(false);

    // Add vendor states
    const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
    const [newVendorName, setNewVendorName] = useState("");
    const [newVendorNumber, setNewVendorNumber] = useState("");
    const [newVendorCompany, setNewVendorCompany] = useState("");
    const [newVendorGst, setNewVendorGst] = useState("");
    const [isVendorSubmitting, setIsVendorSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            getTransactionActionCategoriesApi().then(res => {
                const grouped = res.reduce((acc, item) => {
                    if (!acc[item.main_category]) acc[item.main_category] = [];
                    acc[item.main_category].push(item.sub_category);
                    return acc;
                }, {});
                setActionCategories(grouped);
            }).catch(console.error);

            getBranchesApi().then(res => setBranchList(res || [])).catch(console.error);
            getVendorsApi().then(res => setVendorList(res || [])).catch(console.error);
            getUsersApi().then(res => setUsersList(res || [])).catch(console.error);

            if (existingAction) {
                setMainCategory(existingAction.main_category || "Select Main Category");
                setSubCategory(existingAction.sub_category || "Select Category");
                setBranch(existingAction.branch || "Select Branch");
                setDescription(existingAction.description || "");
                setSpendMode(existingAction.spend_mode || "Select Spend Mode");
                setTransactionTo(existingAction.vendor_name || "");
                setGst(existingAction.gst || "No");
                setVendorType(existingAction.vendor_type || "Regular");
            } else {
                setMainCategory("Select Main Category");
                setSubCategory("Select Category");
                setBranch("Select Branch");
                setDescription("");
                setSpendMode("Select Spend Mode");
                setTransactionTo("");
                setGst("No");
                setVendorType("Regular");
            }
        }
    }, [open, existingAction]);

    const handleSaveNewVendor = async () => {
        if (!newVendorName || !newVendorCompany || !newVendorGst || !newVendorNumber) {
            return message.error("Please fill all required vendor fields");
        }
        setIsVendorSubmitting(true);
        try {
            await addVendorApi({
                name: newVendorName,
                number: newVendorNumber,
                company_name: newVendorCompany,
                gst: newVendorGst,
                email: "",
                address: ""
            });
            message.success("Vendor added!");
            const updatedVendors = await getVendorsApi();
            setVendorList(updatedVendors);
            setTransactionTo(newVendorName);
            setIsAddVendorOpen(false);
            setNewVendorName("");
            setNewVendorNumber("");
            setNewVendorCompany("");
            setNewVendorGst("");
        } catch (err) {
            message.error("Failed to add vendor");
        } finally {
            setIsVendorSubmitting(false);
        }
    };

    const handleSave = async () => {
        const trimmedDescription = description.trim();
        if (!trimmedDescription) return message.error("Description is required");
        if (mainCategory === "Select Main Category") return message.error("Select Main Category");
        if (subCategory === "Select Category") return message.error("Select Sub Category");
        if (branch === "Select Branch") return message.error("Select Branch");
        if (spendMode === "Select Spend Mode") return message.error("Select Spend Mode");
        if (!transactionTo) return message.error("Select Vendor / Transaction To");

        setSaving(true);
        try {
            const payload = {
                purpose: trimmedDescription, // Mapping description to purpose for the backend
                main_category: mainCategory,
                sub_category: subCategory,
                branch: branch,
                description: trimmedDescription,
                spend_mode: spendMode,
                vendor_name: transactionTo,
                vendor_type: vendorType,
                gst: gst
            };

            let res;
            if (existingAction) {
                if (isCash) {
                    res = await updateCashTransactionActionApi(record.id, payload);
                } else {
                    res = await updateTransactionActionApi(record.id, payload);
                }
            } else {
                if (isCash) {
                    res = await createCashTransactionActionApi({ ...payload, cash_transaction_id: record.id });
                } else {
                    res = await addTransactionActionApi({ ...payload, bank_transaction_id: record.id });
                }
            }

            if (res?.success) {
                message.success("Transaction action saved successfully!");
                onActionUpdate(record.id, {
                    id: existingAction ? existingAction.id : res.data?.id,
                    ...payload
                });
                onClose();
            }
        } catch (error) {
            console.error("Action save error:", error);
            if (error?.status === 409 || error?.response?.status === 409) {
                message.error("This transaction already has an action.");
            } else {
                message.error(error?.message || "Failed to save action");
            }
        } finally {
            setSaving(false);
        }
    };

    const branchMenu = (
        <Menu
            onClick={(e) => setBranch(e.key)}
            items={branchList.map(b => ({ key: b.name, label: b.name }))}
        />
    );

    return (
        <Modal
            title={existingAction ? "Edit Transaction Action" : "New Transaction Action"}
            open={open}
            onCancel={onClose}
            onOk={handleSave}
            confirmLoading={saving}
            width={700}
            okText={existingAction ? "Update" : "Save"}
        >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: 16 }}>
                <div>
                    <label>Main Category <span style={{ color: "red" }}>*</span></label>
                    <Select
                        showSearch
                        style={{ width: "100%", marginTop: 8 }}
                        placeholder="Select Main Category"
                        value={mainCategory === "Select Main Category" ? undefined : mainCategory}
                        onChange={(val) => {
                            setMainCategory(val);
                            setSubCategory("Select Category");
                        }}
                        options={Object.keys(actionCategories).map(cat => ({ value: cat, label: cat }))}
                    />
                </div>
                <div>
                    <label>Sub Category <span style={{ color: "red" }}>*</span></label>
                    <Select
                        showSearch
                        style={{ width: "100%", marginTop: 8 }}
                        placeholder="Select Sub Category"
                        value={subCategory === "Select Category" ? undefined : subCategory}
                        onChange={setSubCategory}
                        options={(actionCategories[mainCategory] || []).map(sub => ({ value: sub, label: sub }))}
                        disabled={mainCategory === "Select Main Category"}
                    />
                </div>
                <div>
                    <label>Branch <span style={{ color: "red" }}>*</span></label>
                    <Dropdown overlay={branchMenu} trigger={["click"]}>
                        <Button style={{ width: "100%", marginTop: 8, textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            {branch} <DownOutlined />
                        </Button>
                    </Dropdown>
                </div>
                <div>
                    <label>Spend Mode <span style={{ color: "red" }}>*</span></label>
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
                        <Button style={{ width: "100%", marginTop: 8, textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            {spendMode} <DownOutlined />
                        </Button>
                    </Dropdown>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                    <label>Transaction To / Vendor <span style={{ color: "red" }}>*</span></label>
                    <Radio.Group
                        value={vendorType}
                        onChange={(e) => {
                            setVendorType(e.target.value);
                            setTransactionTo("");
                        }}
                        style={{ display: 'block', marginTop: 8, marginBottom: 8 }}
                    >
                        <Radio value="Regular">Regular Vendor</Radio>
                        <Radio value="One Time">One Time Vendor</Radio>
                    </Radio.Group>
                    {vendorType === "Regular" ? (
                        <>
                            <Select
                                showSearch
                                style={{ width: "100%" }}
                                placeholder="Select Vendor"
                                optionFilterProp="children"
                                value={transactionTo || undefined}
                                onChange={setTransactionTo}
                                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                options={vendorList.map(v => ({ value: v.name, label: v.name }))}
                            />
                            <Button type="link" size="small" onClick={() => setIsAddVendorOpen(true)} style={{ padding: 0, marginTop: 4, color: '#d4af37' }}>
                                + Add New Vendor
                            </Button>
                        </>
                    ) : (
                        <Input
                            placeholder="Enter One Time Vendor Name"
                            value={transactionTo}
                            onChange={(e) => setTransactionTo(e.target.value)}
                        />
                    )}
                </div>
                <div>
                    <label>GST <span style={{ color: "red" }}>*</span></label>
                    <Radio.Group value={gst} onChange={e => setGst(e.target.value)} style={{ display: 'block', marginTop: 8 }}>
                        <Radio value="Yes">Yes</Radio>
                        <Radio value="No">No</Radio>
                    </Radio.Group>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                    <label>Description <span style={{ color: "red" }}>*</span></label>
                    <Input.TextArea
                        rows={2}
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        style={{ marginTop: 8 }}
                        placeholder="Add a description..."
                    />
                </div>
            </div>

            <Modal
                title="Add New Vendor"
                open={isAddVendorOpen}
                onCancel={() => setIsAddVendorOpen(false)}
                footer={null}
            >
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
                    <Input placeholder="Vendor Name *" value={newVendorName} onChange={(e) => setNewVendorName(e.target.value)} />
                    <Input placeholder="Company Name *" value={newVendorCompany} onChange={(e) => setNewVendorCompany(e.target.value)} />
                    <Input placeholder="GST Number *" value={newVendorGst} onChange={(e) => setNewVendorGst(e.target.value)} />
                    <Input placeholder="Phone Number *" value={newVendorNumber} onChange={(e) => setNewVendorNumber(e.target.value)} />
                    <Button type="primary" onClick={handleSaveNewVendor} loading={isVendorSubmitting} style={{ marginTop: "10px" }}>
                        Submit
                    </Button>
                </div>
            </Modal>
        </Modal>
    );
}
