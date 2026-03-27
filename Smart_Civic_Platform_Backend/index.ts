import express, { Request, Response, NextFunction } from "express";
const app = express();

app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Backend Running Successfully");
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
