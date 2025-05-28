const express = require("express");
const http = require("http");
const cors = require("cors"); // Middleware to enable cross-origin requests
const { Server } = require("socket.io"); // Socket.IO Server class  for a WebSocket server
const OpenAI = require("openai");
const dotenv = require("dotenv");
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY 
});

async function getGPTReply(message) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: message }]
    });
    return response.choices[0].message.content;
  } catch (error) {
    console.error("OpenAI error:", error);
    return "Sorry, I couldn’t get a response.";
  }
}

const app = express(); // Express app instance
const server = http.createServer(app);
const io = new Server(server, {     // New Socket.IO server instance
  cors: {
    origin: "*",  // Allow all origins
    methods: ["GET", "POST"] // Get and Post methods
  },
  path: "/socket.io"
});

app.use(cors()); // For CORS all routes
app.use(express.json()); // For JSON


let waitingUser = null;

io.on("connection", (socket) => {
  
    console.log("User connected:", socket.id);

  if (waitingUser) {

    const partnerId = waitingUser;
    waitingUser = null;
    
    socket.join(partnerId);
    socket.partner = partnerId;
    
    io.to(partnerId).emit("partner_found", socket.id);
    socket.emit("partner_found", partnerId);
  } 
  else {
    waitingUser = socket.id;
  }

  socket.on("send_message", (data) => {
    
    const partnerId = socket.partner;
    
    if (partnerId) {
      io.to(partnerId).emit("receive_message", data);
    }
  });

  socket.on("disconnect", () => {
    
    console.log("User disconnected:", socket.id);
    
    if (waitingUser === socket.id) {
      waitingUser = null;
    }

    if (socket.partner) {
      io.to(socket.partner).emit("partner_disconnected");
    }
  });
});

app.get("/", (req, res) => {
  console.log("GET / route hit");
  res.send("Server is up and running");
});

app.post("/api/chatgpt", async (req, res) => {
  const { message } = req.body;
  try {
    const reply = await getGPTReply(message);
    res.json({ reply });
  } catch (error) {
    console.error("GPT error:", error.message);
    res.status(500).json({ error: "Failed to get GPT response" });
  }
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => { 
    console.log(`Server running on port ${PORT}`);
});
