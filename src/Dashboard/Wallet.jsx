import React, { useEffect, useState } from "react";
import { Button, Input, DatePicker, Select, message, Modal } from "antd";
import dayjs from "dayjs";
import { addWalletApi, getUsersApi } from "../../Api/action";
import {
    Wallet2,
    CalendarDays,
    UsersRound,
} from "lucide-react";
import { CommonToaster } from "../../Common/CommonToaster";
import WalletBalanceTable from "./WalletBalance";

export default function WalletPage() {
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState(dayjs());
    const [userId, setUserId] = useState(null);
    const [note, setNote] = useState("");
    const [users, setUsers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [reloadTable, setReloadTable] = useState(0);

    useEffect(() => {
        async function loadUsers() {
            try {
                const res = await getUsersApi();
                const onlyUsers = res.filter(u => u.role !== "admin");
                setUsers(onlyUsers);
            } catch (err) {
                console.log(err);
            }
        }
        loadUsers();
    }, []);

    const handleSubmit = async () => {
        if (!amount || !date || !userId) {
            return CommonToaster("All fields are required", "error");
        }
        try {
            await addWalletApi({
                amount,
                date: date.format("YYYY-MM-DD"),
                user_id: userId,
                note
            });
            CommonToaster("Wallet added successfully!", "success");
            setAmount("");
            setDate(dayjs());
            setUserId(null);
            setNote("");
            setIsModalOpen(false);
            setReloadTable(prev => prev + 1);
        } catch (err) {
            CommonToaster(err.message || "Error adding wallet", "error");
        }
    };

    return (
        <div
            style={{
                position: "relative",
                minHeight: "100vh",
                padding: "20px 20px",
                background: "#261d011a",
                overflow: "hidden",
            }}
        >
            <WalletBalanceTable
                onAddWallet={(user) => {
                    setUserId(user.id);
                    setIsModalOpen(true);
                }}
                reloadTrigger={reloadTable}
            />

            <Modal
                title={
                    <div style={{ textAlign: "center" }}>
                        <div
                            style={{
                                width: 50,
                                height: 50,
                                borderRadius: "50%",
                                background: "#d4af371a",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                margin: "auto",
                                marginBottom: 10
                            }}
                        >
                            <Wallet2 size={24} color="#d4af37" />
                        </div>
                        <h3 style={{ margin: 0, fontSize: 20 }}>Add Wallet Amount</h3>
                        <p style={{ color: "#777", fontSize: 13, fontWeight: 400, marginTop: 4 }}>
                            Add funds to user wallet for tracking
                        </p>
                    </div>
                }
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                centered
            >
                <div style={{ display: "grid", gap: 15, marginTop: 20 }}>
                    {/* Alloting For */}
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <label style={{ fontWeight: 500, marginBottom: 5, fontSize: 14 }}>
                            Alloting For <span style={{ color: "red" }}>*</span>
                        </label>
                        <Select
                            size="large"
                            placeholder="Select user"
                            value={userId}
                            onChange={setUserId}
                            style={{ width: "100%", borderRadius: 8 }}
                        >
                            {users.map((u) => (
                                <Select.Option key={u.id} value={u.id}>
                                    {u.name}
                                </Select.Option>
                            ))}
                        </Select>
                    </div>

                    {/* Wallet Amount */}
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <label style={{ fontWeight: 500, marginBottom: 5, fontSize: 14 }}>
                            Wallet Amount <span style={{ color: "red" }}>*</span>
                        </label>
                        <Input
                            size="large"
                            type="number"
                            placeholder="Enter amount"
                            prefix={<span style={{ marginRight: 5, fontWeight: 600 }}>₹</span>}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            style={{ borderRadius: 8 }}
                        />
                    </div>

                    {/* Added Date */}
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <label style={{ fontWeight: 500, marginBottom: 5, fontSize: 14 }}>
                            Add Date <span style={{ color: "red" }}>*</span>
                        </label>
                        <DatePicker
                            size="large"
                            value={date}
                            onChange={setDate}
                            style={{ width: "100%", borderRadius: 8 }}
                            format="DD MMM YYYY"
                        />
                    </div>

                    {/* Note */}
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <label style={{ fontWeight: 500, marginBottom: 5, fontSize: 14 }}>
                            Note
                        </label>
                        <Input.TextArea
                            placeholder="Add a note (optional)"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            style={{ borderRadius: 8 }}
                            rows={3}
                        />
                    </div>

                    {/* Button */}
                    <Button
                        type="primary"
                        size="large"
                        onClick={handleSubmit}
                        style={{
                            height: 45,
                            borderRadius: 10,
                            background: "#d4af37",
                            borderColor: "#d4af37",
                            fontSize: 16,
                            fontWeight: 600,
                            marginTop: 10
                        }}
                        block
                    >
                        Add to Wallet
                    </Button>
                </div>
            </Modal>
        </div>
    );
}
