import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

export const getAI = () => {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

export const PTERO_CONFIG = {
  PANEL_URL: "https://panelmrc.vezxa.com",
  PANEL_APP_KEY: "ptla_O2F0brfuGmWBNxGtwR9nyfAGw0D2JUtWZzD93ZYlvoR",
  PANEL_CLIENT_KEY: "ptlc_vHsDw9qhsKZGhmEQm8UgbwrwzbIfT0aeTmzNbcQE2oA",
  NEST_ID: 5,
  EGG_ID: 15,
  NODE_ID: 1,
  DOCKER_IMAGE: "ghcr.io/parkervcp/yolks:nodejs_20",

  COINS_PER_REFERRAL: 2,
  COINS_FOR_NEW_USER: 3,
  FREE_SERVER_FOR_NEW_USER: true,

  SERVER_TYPES: {
    "5gb": { name: "5ɢʙ ꜱᴇʀᴠᴇʀ", coins: 5, memory: 512, disk: 5120, cpu: 50 },
    "10gb": { name: "10ɢʙ ꜱᴇʀᴠᴇʀ", coins: 10, memory: 1024, disk: 10240, cpu: 75 },
    "25gb": { name: "25ɢʙ ꜱᴇʀᴠᴇʀ", coins: 20, memory: 2048, disk: 25600, cpu: 100 },
    "50gb": { name: "50ɢʙ ꜱᴇʀᴠᴇʀ", coins: 35, memory: 4096, disk: 51200, cpu: 150 },
    "unlimited": { name: "ᴜɴʟɪᴍɪᴛᴇᴅ ꜱᴇʀᴠᴇʀ", coins: 50, memory: 0, disk: 0, cpu: 0 }
  } as Record<string, any>,

  MILESTONE_REWARDS: {
    5: 10,
    10: 25,
    25: 50,
    50: 100,
    100: 250
  } as Record<number, number>,

  DEV_LINK_CHECK_DELAY: 3,
  DEV_LINK_WARNING_DELAY: 5,
  DEV_SERVER_RENEWAL_DAYS: 5,
  USER_SERVER_LIFETIME_DAYS: 30,
  USER_WARNING_DAYS: 3,
  INACTIVE_DELETE_DAYS: 3,
  MONITOR_INTERVAL_MINUTES: 30,
};
