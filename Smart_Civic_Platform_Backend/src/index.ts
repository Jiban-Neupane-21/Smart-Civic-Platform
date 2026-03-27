import express, { Request, Response } from "express";

const app = express();
const PORT = 5000;

app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Backend Running Successfully.");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
