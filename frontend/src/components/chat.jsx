import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";

const socket = io("https://narrativepsychapp.onrender.com", {
  path: "/socket.io",
  transports: ["websocket"],
});

const stages = [
  "1. Share your Story",
  "2. Let's try to externalize the Problem",
  "3. Can we find Unique Outcomes",
  "4. Time to be the author of our own Story",
  "5. Can we see the new Narrative",
];

function Chat() {
  const [partnerConnected, setPartnerConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    socket.on("partner_found", () => {
      setPartnerConnected(true);
      setMessages((prev) => [
        ...prev,
        { system: true, text: "Partner connected!" },
      ]);
    });

    socket.on("receive_message", (msg) => {
      setMessages((prev) => [...prev, { fromPartner: true, text: msg }]);
    });

    socket.on("partner_disconnected", () => {
      setPartnerConnected(false);
      setMessages((prev) => [
        ...prev,
        { system: true, text: "Partner disconnected." },
      ]);
    });

    return () => {
      socket.off("partner_found");
      socket.off("receive_message");
      socket.off("partner_disconnected");
    };
  }, []);

  const fallbackToGPT = async (message) => {
    try {
      const res = await fetch("/api/chatgpt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { fromPartner: true, text: data.reply }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { system: true, text: "Error contacting AI service." },
      ]);
    }
  };

  const sendMessage = async () => {
    if (input.trim() === "") return;

    setMessages((prev) => [...prev, { fromMe: true, text: input }]);
    setInput("");

    if (partnerConnected) {
      socket.emit("send_message", input);
    } else {
      await fallbackToGPT(input);
    }
  };

  const nextStage = () => {
    if (stageIndex < stages.length - 1) {
      setStageIndex(stageIndex + 1);
      setMessages((prev) => [
        ...prev,
        { system: true, text: `Now entering: ${stages[stageIndex + 1]}` },
      ]);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "auto" }}>
      <h2>Narrative Power Chat</h2>
      <h4>Current Stage: {stages[stageIndex]}</h4>

      <div
        style={{
          height: 300,
          overflowY: "scroll",
          border: "1px solid gray",
          padding: 10,
        }}
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              color: msg.system ? "gray" : msg.fromMe ? "blue" : "green",
              marginBottom: 6,
            }}
          >
            {msg.system ? (
              <em>{msg.text}</em>
            ) : msg.fromMe ? (
              <strong>You:</strong>
            ) : (
              <strong>Partner:</strong>
            )}{" "}
            {!msg.system && msg.text}
          </div>
        ))}
      </div>

      <input
        type="text"
        value={input}
        disabled={false}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        placeholder={
          partnerConnected ? "Type a message..." : "Type message to AI..."
        }
        style={{ width: "100%", padding: 8, marginTop: 10 }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 10,
        }}
      >
        <button onClick={sendMessage} disabled={input.trim() === ""}>
          Send
        </button>
        <button onClick={nextStage} disabled={stageIndex >= stages.length - 1}>
          Next Stage
        </button>
      </div>
    </div>
  );
}

export default Chat;
