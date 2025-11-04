// ====================== IMPORTS ======================
import axios from "axios";
import { Modal } from "antd";

// ====================== AXIOS INSTANCE ======================
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000",
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

// ====================== TOKEN & MODAL HANDLING ======================
let isModalVisible = false;
let modalInstance = null;

// ✅ Token Expiry Check
const isTokenExpired = (token) => {
    if (!token) return true;
    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload.exp < Date.now() / 1000;
    } catch (e) {
        return true;
    }
};

// ✅ Show Modal
const showExpiredModal = () => {
    if (isModalVisible) return;

    isModalVisible = true;

    modalInstance = Modal.warning({
        title: "Session Expired",
        centered: true,
        content: "Your session has expired. Please log in again.",
        onOk: handleModalClose,
    });
};

// ✅ Modal Close Handler
const handleModalClose = () => {
    if (modalInstance) modalInstance.destroy();
    modalInstance = null;
    isModalVisible = false;

    window.dispatchEvent(new Event("tokenExpireUpdated"));
};

// ====================== REQUEST INTERCEPTOR ======================
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("AccessToken");

        if (token) {
            if (isTokenExpired(token)) {
                showExpiredModal();
                return Promise.reject(new Error("Token expired"));
            }

            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// ================================================================
// ✅ AUTH APIs
// ================================================================

// ✅ LOGIN
export const apiLogin = async (payload) => {
    try {
        const res = await api.post("/api/auth/login", payload);

        if (res.data.token) {
            localStorage.setItem("AccessToken", res.data.token);
            localStorage.setItem("loginDetails", JSON.stringify(res.data.user));
        }

        return res.data;
    } catch (err) {
        throw err?.response?.data || err;
    }
};

// ✅ LOGOUT
export const apiLogout = async () => {
    try {
        const res = await api.post("/api/auth/logout");

        localStorage.removeItem("AccessToken");
        localStorage.removeItem("loginDetails");

        return res.data;
    } catch (err) {
        throw err?.response?.data || err;
    }
};

export const getUser = async () => {
    try {
        const res = await api.get("/api/auth/me");
        return res.data;
    } catch (err) {
        throw err?.response?.data || err;
    }
};


// ✅ GET expense categories
export const getExpenseCategoriesApi = async () => {
    const res = await api.get("/api/categories/expense");
    return res.data;
};

// ✅ GET income categories
export const getIncomeCategoriesApi = async () => {
    const res = await api.get("/api/categories/income");
    return res.data;
};

// ✅ Add new expense category
export const addExpenseCategoryApi = async (payload) => {
    const res = await api.post("/api/categories/expense/add", payload);
    return res.data;
};

// ✅ Add new income category
export const addIncomeCategoryApi = async (payload) => {
    const res = await api.post("/api/categories/income/add", payload);
    return res.data;
};


// ✅ ADD EXPENSE
export const addExpenseApi = async (payload) => {
    try {
        const res = await api.post("/api/transactions/add-expense", payload);
        return res.data;
    } catch (err) {
        throw err?.response?.data || err;
    }
};

// ✅ ADD INCOME
export const addIncomeApi = async (payload) => {
    try {
        const res = await api.post("/api/transactions/add-income", payload);
        return res.data;
    } catch (err) {
        throw err?.response?.data || err;
    }
};


export const getExpensesApi = async () => {
    const res = await api.get("/api/transactions/expenses");
    return res.data;
};

export const getIncomeApi = async () => {
    const res = await api.get("/api/transactions/income");
    return res.data;
};


export const getSummaryApi = async () => {
    const res = await api.get("/api/transactions/summary");
    return res.data;
};


export const getLastMonthSummaryApi = async (date) => {
    const res = await api.get(`/api/transactions/last-month-summary?date=${date}`);
    return res.data;
};

export const getApprovalsApi = async () => {
    const res = await api.get("/api/transactions/approvals");
    return res.data;
};


export const approveExpenseApi = async (payload) => {
    const res = await api.post("/api/transactions/approve-expense", payload);
    return res.data;
};


export const rejectExpenseApi = async (payload) => {
    const res = await api.post("/api/transactions/reject-expense", payload);
    return res.data;
};


// === ADMIN: Users ===
export const createUserApi = async (payload) => {
    const res = await api.post("/api/auth/create-user", payload);
    return res.data;
};

export const getUsersApi = async () => {
    const res = await api.get("/api/auth/users");
    return res.data;
};

export const deleteUserApi = async (id) => {
    const res = await api.delete(`/api/auth/users/${id}`);
    return res.data;
};
