import db from "../db/connection";

export interface Redirect {
  id?: number;
  shop_domain: string;
  from_path: string;
  to_path: string;
  is_active: boolean;
}

export const RedirectModel = {
  async create(redirect: Redirect) {
    return await db("redirects").insert(redirect).returning("*");
  },

  async findByPath(shop_domain: string, from_path: string) {
    return await db("redirects")
      .where({ shop_domain, from_path, is_active: true })
      .first();
  },

  async getAllForShop(shop_domain: string) {
    return await db("redirects")
      .where({ shop_domain })
      .orderBy("created_at", "desc");
  }
}; 