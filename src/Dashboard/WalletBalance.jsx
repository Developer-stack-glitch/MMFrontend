import React, { useEffect, useState } from "react";
import { Table, Button, Input } from "antd";
import { getUsersApi, getWalletEntriesApi } from "../../Api/action";
import { Wallet2, Plus } from "lucide-react";
import dayjs from "dayjs";

export default function WalletBalanceTable({ onAddWallet, reloadTrigger }) {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // 🔥 ONLY SEARCH FILTER LEFT
    const [searchText, setSearchText] = useState("");

    // Load Users + Wallet Balance
    useEffect(() => {
        async function loadUsers() {
            try {
                const userList = await getUsersApi();
                const filtered = userList.filter(u => u.role !== "admin");

                const usersWithBalance = await Promise.all(
                    filtered.map(async (u) => {
                        try {
                            const bal = await getWalletEntriesApi(u.id);
                            return { ...u, wallet: bal.wallet };
                        } catch {
                            return { ...u, wallet: 0 };
                        }
                    })
                );

                setUsers(usersWithBalance);
                setFilteredUsers(usersWithBalance);
                setLoading(false);

            } catch (err) {
                console.log(err);
            }
        }

        loadUsers();
    }, [reloadTrigger]);

    // Apply Filters (ONLY SEARCH)
    useEffect(() => {
        let data = [...users];

        if (searchText.trim()) {
            data = data.filter(u =>
                u.name.toLowerCase().includes(searchText.toLowerCase()) ||
                (u.email || "").toLowerCase().includes(searchText.toLowerCase())
            );
        }

        setFilteredUsers(data);

    }, [searchText, users]);

    const columns = [
        {
            title: "User",
            dataIndex: "name",
            key: "name",
            render: (text, record) => (
                <div className="wallet-user-flex">
                    <div className="wallet-avatar">{record.name.charAt(0)}</div>

                    <div className="wallet-user-info">
                        <div className="wallet-user-name">{record.name}</div>
                        <div className="wallet-user-email">{record.email || "No Email"}</div>
                    </div>
                </div>
            ),
        },
        {
            title: "Phone",
            dataIndex: "phone",
            key: "phone",
            render: (text) => text || "-",
        },
        {
            title: "Wallet Balance",
            dataIndex: "wallet",
            key: "wallet",
            render: (amount) => (
                <span className="wallet-amount">
                    ₹{Number(amount).toLocaleString()}
                </span>
            ),
        },
        {
            title: "Action",
            key: "action",
            render: (_, record) => (
                <Button
                    type="primary"
                    className="wallet-add-btn"
                    onClick={() => onAddWallet(record)}
                >
                    <Plus size={16} />
                    Add Wallet
                </Button>
            ),
        },
    ];

    return (
        <div className="wallet-table-container">
            <h2 className="wallet-table-title">
                <Wallet2 size={24} color="#d4af37" /> User Wallet List
            </h2>

            {/* 🔍 ONLY SEARCH FILTER NOW */}
            <div className="wallet-filter-box">
                <Input
                    placeholder="Search name or email"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="wallet-filter-input"
                />
            </div>

            <Table
                className="wallet-table"
                loading={loading}
                columns={columns}
                dataSource={filteredUsers}
                rowKey={(record) => record.id}
                pagination={{ pageSize: 8 }}
            />
        </div>
    );
}
