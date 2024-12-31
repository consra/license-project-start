import express from "express";
import { RedirectModel } from "../models/redirect";

const router = express.Router();

router.post("/api/redirects", async (req, res) => {
  const { shop } = res.locals;
  const { fromPath, toPath } = req.body;

  try {
    const redirect = await RedirectModel.create({
      shop_domain: shop.domain,
      from_path: fromPath,
      to_path: toPath,
      is_active: true
    });
    
    res.json(redirect);
  } catch (error) {
    res.status(500).json({ error: "Failed to create redirect" });
  }
});

router.get("/api/redirects", async (req, res) => {
  const { shop } = res.locals;
  
  try {
    const redirects = await RedirectModel.getAllForShop(shop.domain);
    res.json(redirects);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch redirects" });
  }
});

export default router; 