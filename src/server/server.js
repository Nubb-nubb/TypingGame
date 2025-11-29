//start server.mjs
import { WebSocketServer } from "ws";

// Create a WebSocket server on port 8080
const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", (socket) => {
  console.log("Client connected");

  // Receive messages from a client
  socket.on("message", (data) => {
    console.log("Received from client:", data.toString());

    // Echo back for now (just to prove it works)
    socket.send(`Server echo: ${data.toString()}`);
  });

  socket.on("close", () => {
    console.log("Client disconnected");
  });
});

console.log("WebSocket server listening on ws://localhost:8080");
//end server.mjs
