import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = (userId: number) => {
  if (!socket) {
    socket = io("http://localhost:5000", {
      withCredentials: true,
      transports: ["websocket"],
      auth: { userId },
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};
