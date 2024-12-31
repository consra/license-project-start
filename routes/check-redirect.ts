import express from "express";
import { RedirectModel } from "../models/redirect";

const router = express.Router();

router.get("/api/check-redirect", async (req, res) => {
  const { shop } = res.locals;
  const path = req.query.path as string;

  try {
    const redirect = await RedirectModel.findByPath(shop.domain, path);
    
    if (redirect) {
      res.json({ redirect_to: redirect.to_path });
    } else {
      res.json({ redirect_to: null });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to check redirect" });
  }
});

export default router; 