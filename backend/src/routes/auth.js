import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { pool } from "../db.js";
import { signToken, authRequired } from "../auth.js";

const r = Router();

r.post("/login", async (req, res, next) => {
  try {
    const { identifier, password } = z.object({
      identifier: z.string().min(1), password: z.string().min(1),
    }).parse(req.body);
    const { rows } = await pool.query(
      "SELECT * FROM users WHERE LOWER(email)=LOWER($1) OR LOWER(username)=LOWER($1) LIMIT 1",
      [identifier]
    );
    const u = rows[0];
    if (!u || !(await bcrypt.compare(password, u.password_hash)))
      return res.status(401).json({ message: "Invalid credentials" });
    if (u.status !== "active") return res.status(403).json({ message: "Account suspended" });
    const token = signToken(u);
    await pool.query("INSERT INTO audit_logs (actor, action, target) VALUES ($1,'auth.login',$2)", [u.email, u.id]);
    res.json({
      token,
      mustChangePassword: u.must_change_password,
      user: { id: u.id, email: u.email, username: u.username, name: u.name, role: u.role, status: u.status },
    });
  } catch (e) { next(e); }
});

r.post("/change-password", authRequired, async (req, res, next) => {
  try {
    const { current, next: nextPw } = z.object({
      current: z.string().min(1), next: z.string().min(8),
    }).parse(req.body);
    const { rows } = await pool.query("SELECT * FROM users WHERE id=$1", [req.user.sub]);
    const u = rows[0];
    if (!u || !(await bcrypt.compare(current, u.password_hash)))
      return res.status(400).json({ message: "Current password incorrect" });
    const hash = await bcrypt.hash(nextPw, 12);
    await pool.query("UPDATE users SET password_hash=$1, must_change_password=false WHERE id=$2", [hash, u.id]);
    await pool.query("INSERT INTO audit_logs (actor, action, target) VALUES ($1,'auth.password_changed',$2)", [u.email, u.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

r.post("/forgot", async (req, res, next) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    await pool.query("INSERT INTO audit_logs (actor, action, target) VALUES ($1,'auth.password_reset_requested',$1)", [email]);
    // TODO: generate token in password_resets table + send email
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default r;
