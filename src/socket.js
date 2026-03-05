import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

let socket;

export const initiateSocketConnection = () => {
    socket = io(SOCKET_URL, {
        withCredentials: true,
        transports: ['websocket', 'polling']
    });
    console.log(`Connecting socket...`);
};

export const disconnectSocket = () => {
    console.log("Disconnecting socket...");
    if (socket) socket.disconnect();
};

export const subscribeToNotifications = (cb) => {
    if (!socket) return true;
    socket.on("newApproval", (data) => {
        console.log("Websocket event received (newApproval):", data);
        return cb(null, data);
    });
};

export const subscribeToApprovalUpdates = (cb) => {
    if (!socket) return true;
    socket.on("approvalUpdated", (data) => {
        console.log("Websocket event received (approvalUpdated):", data);
        return cb(null, data);
    });
};

export const getSocket = () => socket;
