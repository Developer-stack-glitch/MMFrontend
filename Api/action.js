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
    const res = await api.get("/api/categories/expense-category");
    return res.data;
};

// ✅ GET income categories
export const getIncomeCategoriesApi = async () => {
    const res = await api.get("/api/categories/income-category");
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


export const getExpensesApi = async (page = 1) => {
    const res = await api.get(`/api/transactions/expenses-transactions?page=${page}&limit=10`);
    return res.data;
};

export const getIncomeApi = async (page = 1) => {
    const res = await api.get(`/api/transactions/income-transactions?page=${page}&limit=10`);
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


// ADD WALLET AMOUNT
export const addWalletApi = async (payload) => {
    try {
        const res = await api.post("/api/wallet/add-wallet", payload);
        return res.data;
    } catch (err) {
        throw err?.response?.data || err;
    }
};


export const getWalletEntriesApi = async (userId) => {
    const res = await api.get(`/api/wallet/wallet/${userId}`);
    return res.data;
};

export const getExpensesPaginatedApi = async (page, limit = 10) => {
    const res = await api.get(`/api/transactions/expenses-paginated?page=${page}&limit=${limit}`);
    return res.data;
};

export const getIncomePaginatedApi = async (page, limit = 10) => {
    const res = await api.get(`/api/transactions/income-paginated?page=${page}&limit=${limit}`);
    return res.data;
};

export const editExpenseApi = async (payload) => {
    return await api.post("/api/transactions/edit-expense", payload);
};

export const getUserAllExpensesApi = async () => {
    const res = await api.get("/api/transactions/user-all-expenses");
    return res.data;
};


// ================================================================
// ✅ CALENDAR APIs
// ================================================================

// ✅ CREATE EVENT
export const createEventApi = async (payload) => {
    try {
        const res = await api.post("/api/calendar/add-event", payload);
        return res.data;
    } catch (err) {
        throw err?.response?.data || err;
    }
};

// ✅ GET ALL EVENTS
export const getEventsApi = async (filters = {}) => {
    try {
        const params = new URLSearchParams();
        if (filters.startDate) params.append('start_date', filters.startDate);
        if (filters.endDate) params.append('end_date', filters.endDate);
        if (filters.category) params.append('category', filters.category);

        const queryString = params.toString();
        const endpoint = queryString ? `/api/calendar/events?${queryString}` : '/api/calendar/events';

        const res = await api.get(endpoint);
        return res.data;
    } catch (err) {
        throw err?.response?.data || err;
    }
};

// ✅ GET EVENT BY ID
export const getEventByIdApi = async (eventId) => {
    try {
        const res = await api.get(`/api/calendar/event/${eventId}`);
        return res.data;
    } catch (err) {
        throw err?.response?.data || err;
    }
};

// ✅ UPDATE EVENT
export const updateEventApi = async (eventId, payload) => {
    try {
        const res = await api.put(`/api/calendar/event/${eventId}`, payload);
        return res.data;
    } catch (err) {
        throw err?.response?.data || err;
    }
};

// ✅ DELETE EVENT
export const deleteEventApi = async (eventId) => {
    try {
        console.log("📡 API: Deleting event with ID:", eventId);
        const res = await api.delete(`/api/calendar/event/${eventId}`);
        console.log("📡 API: Delete response:", res.data);
        return res.data;
    } catch (err) {
        console.error("📡 API: Delete failed:", err);
        throw err?.response?.data || err;
    }
};

// ✅ MOVE EVENT TO NEXT DAY
export const moveEventToNextDayApi = async (eventId) => {
    try {
        const res = await api.post(`/api/calendar/event/${eventId}/move-next-day`);
        return res.data;
    } catch (err) {
        throw err?.response?.data || err;
    }
};

// ✅ MOVE EVENT TO NEXT MONTH
export const moveEventToNextMonthApi = async (eventId) => {
    try {
        const res = await api.post(`/api/calendar/event/${eventId}/move-next-month`);
        return res.data;
    } catch (err) {
        throw err?.response?.data || err;
    }
};

// ✅ GET PENDING ALERTS
export const getPendingAlertsApi = async () => {
    try {
        const res = await api.get("/api/calendar/pending-alerts");
        return res.data;
    } catch (err) {
        throw err?.response?.data || err;
    }
};

// ✅ MARK ALERT AS SENT
export const markAlertSentApi = async (eventId) => {
    try {
        const res = await api.post(`/api/calendar/alert/${eventId}/mark-sent`);
        return res.data;
    } catch (err) {
        throw err?.response?.data || err;
    }
};

// ✅ GET EVENTS BY DATE RANGE (for calendar view)
export const getEventsByDateApi = async (month, year) => {
    try {
        const res = await api.get(`/api/calendar/events-by-date?month=${month}&year=${year}`);
        return res.data;
    } catch (err) {
        throw err?.response?.data || err;
    }
};

// ✅ SEARCH EVENTS
export const searchEventsApi = async (query) => {
    try {
        const res = await api.get(`/api/calendar/search?query=${encodeURIComponent(query)}`);
        return res.data;
    } catch (err) {
        throw err?.response?.data || err;
    }
};

