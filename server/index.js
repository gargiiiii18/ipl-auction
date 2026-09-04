import express from "express";
import http from "http";
import cors from "cors";
import routes from "./routes.js";
import { initSockets } from "./sockets.js";

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

app.use('/', routes);

//socket.io requires a raw http node to attach itself to hence creating a server from the express app.
const server = http.createServer(app);
initSockets(server);
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));