import { io } from "socket.io-client";

// Use your server URL
const socket = io("https://narrativepsychapp.onrender.com", {
  path: "/socket.io",
  transports: ["websocket"],
});

export default socket;
