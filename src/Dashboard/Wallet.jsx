import React, { useEffect, useState } from "react";
import { Button, Input, DatePicker, Select, message } from "antd";
import dayjs from "dayjs";
import { addWalletApi, getUsersApi } from "../../Api/action";
import {
    Wallet2,
    CalendarDays,
    UsersRound,
} from "lucide-react";
import { CommonToaster } from "../../Common/CommonToaster";

export default function WalletPage() {
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState(dayjs());
    const [userId, setUserId] = useState("");
    const [users, setUsers] = useState([]);

    useEffect(() => {
        async function loadUsers() {
            try {
                const res = await getUsersApi();
                setUsers(res);
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
                user_id: userId
            });
            CommonToaster("Wallet added successfully!", "success");
            setAmount("");
            setDate(dayjs());
            setUserId("");

        } catch (err) {
            CommonToaster(err.message || "Error adding wallet", "error");
        }
    };

    return (
        <div
            style={{
                position: "relative",
                minHeight: "100vh",
                padding: "60px 20px",
                background: "#261d011a",
                overflow: "hidden",
            }}
        >

            {/* 🔵 Abstract Blurred Shape Left */}
            <div
                style={{
                    position: "absolute",
                    top: "-80px",
                    left: "-80px",
                    width: "280px",
                    height: "280px",
                    background: "rgba(212,175,55,0.25)",
                    filter: "blur(90px)",
                    borderRadius: "50%",
                    zIndex: 0,
                }}
            />

            {/* 🟣 Abstract Blurred Shape Right */}
            <div
                style={{
                    position: "absolute",
                    bottom: "-100px",
                    right: "-100px",
                    width: "320px",
                    height: "320px",
                    background: "rgba(100,120,255,0.25)",
                    filter: "blur(110px)",
                    borderRadius: "50%",
                    zIndex: 0,
                }}
            />

            {/* 🟠 Top Right Soft Glow */}
            <div
                style={{
                    position: "absolute",
                    top: "50px",
                    right: "20%",
                    width: "180px",
                    height: "180px",
                    background: "rgba(255,200,120,0.25)",
                    filter: "blur(90px)",
                    borderRadius: "50%",
                    zIndex: 0,
                }}
            />

            {/* MAIN CARD (unchanged UI) */}
            <div
                style={{
                    position: "relative",
                    zIndex: 2,
                    display: "flex",
                    justifyContent: "center",
                }}
            >
                <div
                    style={{
                        width: "100%",
                        maxWidth: "580px",
                        background: "white",
                        padding: "32px",
                        borderRadius: "18px",
                        boxShadow: "0 10px 35px rgba(0,0,0,0.08)",
                        border: "1px solid #f1f1f1",
                    }}
                >
                    {/* Header */}
                    <div style={{ textAlign: "center", marginBottom: 25 }}>
                        <div
                            style={{
                                width: 68,
                                height: 68,
                                borderRadius: "50%",
                                background: "#d4af371a",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                margin: "auto",
                            }}
                        >
                            <Wallet2 size={34} color="#d4af37" />
                        </div>

                        <h2
                            style={{
                                marginTop: 14,
                                fontWeight: 700,
                                fontSize: 24,
                                marginBottom: 5,
                            }}
                        >
                            Add Wallet Amount
                        </h2>

                        <p style={{ color: "#777", marginTop: 4 }}>
                            Add funds to user wallet for tracking
                        </p>
                    </div>

                    <div style={{ display: "grid", gap: 22 }}>

                        {/* Wallet Amount */}
                        <div className="wallet-input" style={{ display: "flex", flexDirection: "column" }}>
                            <label style={{ fontWeight: 500, marginBottom: 6, fontSize: 16 }}>
                                Wallet Amount
                            </label>
                            <Input
                                size="large"
                                type="number"
                                placeholder="Enter amount"
                                prefix={<Wallet2 size={18} style={{ marginRight: 5 }} />}
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                style={{
                                    borderRadius: 10,
                                    height: 44,
                                    fontSize: 15,
                                }}
                            />
                        </div>

                        {/* Added Date */}
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <label style={{ fontWeight: 500, marginBottom: 6, fontSize: 16 }}>
                                Add Date
                            </label>
                            <DatePicker
                                size="large"
                                value={date}
                                onChange={setDate}
                                style={{
                                    width: "100%",
                                    borderRadius: 10,
                                    height: 48,
                                    fontSize: 15,
                                }}
                                suffixIcon={<CalendarDays size={18} />}
                            />
                        </div>

                        {/* Alloting For */}
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <label style={{ fontWeight: 500, marginBottom: 6, fontSize: 16 }}>
                                Alloting For
                            </label>
                            <Select
                                size="large"
                                placeholder="Select user"
                                value={userId}
                                onChange={setUserId}
                                style={{
                                    width: "100%",
                                    borderRadius: 10,
                                    height: 55,
                                    fontSize: 15,
                                    alignItems: "center"
                                }}
                                suffixIcon={<UsersRound size={18} />}
                            >
                                {users.map((u) => (
                                    <Select.Option key={u.id} value={u.id}>
                                        {u.name}
                                    </Select.Option>
                                ))}
                            </Select>
                        </div>

                        {/* Button */}
                        <Button
                            type="primary"
                            size="large"
                            onClick={handleSubmit}
                            style={{
                                height: 50,
                                borderRadius: 12,
                                background: "#d4af37",
                                borderColor: "#d4af37",
                                fontSize: 16,
                                fontWeight: 600,
                            }}
                            block
                        >
                            Add to Wallet
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );

}
