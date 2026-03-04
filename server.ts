import express from "express";
import { createServer as createViteServer } from "vite";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectDB, User, Server } from "./src/lib/db.ts";
import { ptero } from "./src/lib/ptero.ts";
import { PTERO_CONFIG } from "./src/constants.ts";

const JWT_SECRET = process.env.JWT_SECRET || "fsp-secret-key-123";

async function startServer() {
  await connectDB();
  
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // Ensure default admin exists
  const ensureAdmin = async () => {
    const adminEmail = "admin@gmail.com";
    const adminPass = "admin200831";
    
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      const userId = "admin_root";
      const referralCode = "ADMIN1";
      const hashedPassword = await bcrypt.hash(adminPass, 10);
      
      // Create Ptero User for admin if needed
      const pteroUser = await ptero.createUser(userId, adminEmail);
      
      await User.create({
        id: userId,
        email: adminEmail,
        password: hashedPassword,
        referral_code: referralCode,
        ptero_user_id: pteroUser?.id || 0,
        ptero_username: pteroUser?.username || "admin",
        ptero_password: pteroUser?.password || "admin",
        coins: 999999,
        is_admin: 1,
        mode: 'user'
      });
      console.log("Default admin created");
    } else {
      // Ensure it has admin rights
      if (admin.is_admin === 0) {
        admin.is_admin = 1;
        await admin.save();
      }
    }
  };
  await ensureAdmin();

  // --- API Routes ---

  // Register
  app.post("/api/auth/register", async (req, res) => {
    const { email, password, referrerCode } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email already registered" });

    const userId = Math.random().toString(36).substring(2, 10);
    const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create Ptero User
    const pteroUser = await ptero.createUser(userId, email);
    if (!pteroUser) return res.status(500).json({ error: "Failed to create panel user" });

    let referrerId = null;
    if (referrerCode) {
      const referrer = await User.findOne({ referral_code: referrerCode });
      if (referrer) {
        referrerId = referrer.id;
      }
    }

    const initialCoins = referrerId ? PTERO_CONFIG.COINS_FOR_NEW_USER : 0;

    try {
      const newUser = await User.create({
        id: userId,
        email,
        password: hashedPassword,
        referral_code: referralCode,
        ptero_user_id: pteroUser.id,
        ptero_username: pteroUser.username,
        ptero_password: pteroUser.password,
        coins: initialCoins,
        referrer_id: referrerId,
        is_admin: 0
      });

      if (referrerId) {
        await User.findOneAndUpdate({ id: referrerId }, { 
          $inc: { coins: PTERO_CONFIG.COINS_PER_REFERRAL, referrals: 1 } 
        });
      }

      const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: "7d" });
      res.json({ 
        user: {
          id: newUser.id,
          email: newUser.email,
          coins: newUser.coins,
          mode: newUser.mode,
          referral_code: newUser.referral_code,
          referrals: newUser.referrals,
          is_admin: newUser.is_admin
        }, 
        token 
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Login
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (user.is_banned) {
      return res.status(403).json({ error: "Your account has been banned." });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
    const userObj = user.toObject();
    delete userObj.password;
    res.json({ user: userObj, token });
  });

  // Middleware to verify JWT
  const authenticate = async (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const user = await User.findOne({ id: decoded.userId });
      if (!user || user.is_banned) return res.status(403).json({ error: "Unauthorized or banned" });
      
      req.userId = decoded.userId;
      next();
    } catch (e) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // Middleware to verify Admin
  const isAdmin = async (req: any, res: any, next: any) => {
    const user = await User.findOne({ id: req.userId });
    if (!user || !user.is_admin) return res.status(403).json({ error: "Admin access required" });
    next();
  };

  // Get Profile
  app.get("/api/user/profile", authenticate, async (req: any, res) => {
    const user = await User.findOne({ id: req.userId }, 'id email coins mode referral_code referrals is_admin');
    res.json(user);
  });

  // Set Mode
  app.post("/api/user/mode", authenticate, async (req: any, res) => {
    const { mode } = req.body;
    await User.findOneAndUpdate({ id: req.userId }, { mode });
    res.json({ success: true });
  });

  // Get Servers
  app.get("/api/user/servers", authenticate, async (req: any, res) => {
    const servers = await Server.find({ user_id: req.userId });
    
    // Enrich with status from Ptero
    const enriched = await Promise.all(servers.map(async (s: any) => {
      const status = await ptero.getServerStatus(s.ptero_identifier);
      return { ...s.toObject(), status };
    }));

    res.json(enriched);
  });

  // Buy Server
  app.post("/api/servers/buy", authenticate, async (req: any, res) => {
    const { serverName, type } = req.body;
    const user = await User.findOne({ id: req.userId });
    const typeConfig = PTERO_CONFIG.SERVER_TYPES[type];

    if (!user || !typeConfig) return res.status(400).json({ error: "Invalid request" });
    if (user.coins < typeConfig.coins) return res.status(400).json({ error: "Not enough coins" });

    const pteroServer = await ptero.createServer(user.ptero_user_id!, serverName, user.id, type);
    if (pteroServer.error) return res.status(500).json({ error: pteroServer.error });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + PTERO_CONFIG.USER_SERVER_LIFETIME_DAYS);

    await Server.create({
      user_id: user.id,
      ptero_server_id: pteroServer.id,
      ptero_identifier: pteroServer.identifier,
      name: serverName,
      type: type,
      expires_at: expiresAt
    });

    user.coins -= typeConfig.coins;
    await user.save();

    res.json({ success: true });
  });

  // Delete Server
  app.delete("/api/servers/:serverId", authenticate, async (req: any, res) => {
    const server = await Server.findOne({ _id: req.params.serverId, user_id: req.userId });
    if (!server) return res.status(404).json({ error: "Server not found" });

    const success = await ptero.deleteServer(server.ptero_server_id);
    if (success) {
      await Server.deleteOne({ _id: req.params.serverId });
      res.json({ success: true });
    } else {
      res.status(500).json({ error: "Failed to delete from panel" });
    }
  });

  // Server Power Actions
  app.post("/api/servers/:serverId/power", authenticate, async (req: any, res) => {
    const { action } = req.body;
    const server = await Server.findOne({ _id: req.params.serverId, user_id: req.userId });
    if (!server) return res.status(404).json({ error: "Server not found" });

    const success = await ptero.sendPowerAction(server.ptero_identifier, action);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: "Failed to send power action" });
    }
  });

  // --- Earn Coins Routes ---

  // Daily Reward
  app.post("/api/user/earn/daily", authenticate, async (req: any, res) => {
    const user = await User.findOne({ id: req.userId });
    if (!user) return res.status(404).json({ error: "User not found" });

    const now = new Date();
    const lastReward = user.last_daily_reward ? new Date(user.last_daily_reward) : null;

    if (lastReward && (now.getTime() - lastReward.getTime()) < 24 * 60 * 60 * 1000) {
      const nextReward = new Date(lastReward.getTime() + 24 * 60 * 60 * 1000);
      return res.status(400).json({ 
        error: "Daily reward already claimed", 
        nextReward: nextReward.toISOString() 
      });
    }

    const rewardAmount = 1; // 1 coin per day
    user.coins += rewardAmount;
    user.last_daily_reward = now;
    await user.save();

    res.json({ success: true, coins: user.coins, reward: rewardAmount });
  });

  // Watch Ad (Simulated)
  app.post("/api/user/earn/ad", authenticate, async (req: any, res) => {
    const user = await User.findOne({ id: req.userId });
    if (!user) return res.status(404).json({ error: "User not found" });

    // In a real app, you'd verify the ad completion via a callback from an ad provider
    const rewardAmount = 0.5; 
    user.coins += rewardAmount;
    await user.save();

    res.json({ success: true, coins: user.coins, reward: rewardAmount });
  });

  // Complete Survey (Simulated)
  app.post("/api/user/earn/survey", authenticate, async (req: any, res) => {
    const user = await User.findOne({ id: req.userId });
    if (!user) return res.status(404).json({ error: "User not found" });

    const rewardAmount = 2; 
    user.coins += rewardAmount;
    await user.save();

    res.json({ success: true, coins: user.coins, reward: rewardAmount });
  });

  // Stats for Admin
  app.get("/api/admin/stats", authenticate, isAdmin, async (req, res) => {
    const [usersCount, serversCount, devsCount, userCount, coinsSum, bannedCount] = await Promise.all([
      User.countDocuments(),
      Server.countDocuments(),
      User.countDocuments({ mode: 'dev' }),
      User.countDocuments({ mode: 'user' }),
      User.aggregate([{ $group: { _id: null, total: { $sum: "$coins" } } }]),
      User.countDocuments({ is_banned: 1 })
    ]);

    res.json({
      users: usersCount,
      servers: serversCount,
      devs: devsCount,
      userCount: userCount,
      coins: coinsSum[0]?.total || 0,
      banned: bannedCount,
    });
  });

  // Admin: Get all users
  app.get("/api/admin/users", authenticate, isAdmin, async (req, res) => {
    const users = await User.find({}, 'id email coins mode referrals is_admin is_banned created_at');
    res.json(users);
  });

  // Admin: Update user coins
  app.post("/api/admin/users/:userId/coins", authenticate, isAdmin, async (req, res) => {
    const { coins } = req.body;
    await User.findOneAndUpdate({ id: req.params.userId }, { coins });
    res.json({ success: true });
  });

  // Admin: Give coins to user(s)
  app.post("/api/admin/give-coins", authenticate, isAdmin, async (req, res) => {
    const { userId, amount } = req.body;
    if (!amount || isNaN(amount)) return res.status(400).json({ error: "Invalid amount" });

    if (userId === 'all') {
      await User.updateMany({}, { $inc: { coins: amount } });
    } else {
      const user = await User.findOne({ id: userId });
      if (!user) return res.status(404).json({ error: "User not found" });
      user.coins += amount;
      await user.save();
    }
    res.json({ success: true });
  });

  // Admin: Ban/Unban user
  app.post("/api/admin/users/:userId/ban", authenticate, isAdmin, async (req, res) => {
    const { banned } = req.body;
    await User.findOneAndUpdate({ id: req.params.userId }, { is_banned: banned ? 1 : 0 });
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
