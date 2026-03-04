import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://dinuxx95_db:ipSgSOqHdNg1HuG0@cluster00.gohclgg.mongodb.net/dinu?retryWrites=true&w=majority&appName=Cluster00";

export const connectDB = async () => {
  try {
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // Augmenté à 10s pour laisser plus de temps
      connectTimeoutMS: 10000,
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error: any) {
    console.error('❌ CRITICAL: MongoDB connection failed.');
    
    if (error.name === 'MongooseServerSelectionError') {
      console.error('---------------------------------------------------------');
      console.error('PROBLÈME D\'IP WHITELIST DÉTECTÉ !');
      console.error('Pour corriger cela :');
      console.error('1. Allez sur MongoDB Atlas -> Network Access');
      console.error('2. Ajoutez l\'adresse IP: 0.0.0.0/0 (Allow Access From Anywhere)');
      console.error('---------------------------------------------------------');
    }
    
    console.error('Error details:', error.message);
    
    // En développement, on ne coupe pas le serveur pour permettre de voir l'erreur
    if (process.env.NODE_ENV === 'production') {
      console.error('Exiting due to connection failure in production.');
      process.exit(1);
    }
  }
};

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  referral_code: { type: String, unique: true },
  ptero_user_id: { type: Number },
  ptero_username: { type: String },
  ptero_password: { type: String },
  coins: { type: Number, default: 0 },
  mode: { type: String }, // 'user' or 'dev'
  referrals: { type: Number, default: 0 },
  referrer_id: { type: String },
  is_admin: { type: Number, default: 0 },
  is_banned: { type: Number, default: 0 },
  last_daily_reward: { type: Date },
  created_at: { type: Date, default: Date.now }
});

const serverSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  ptero_server_id: { type: Number, required: true },
  ptero_identifier: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  expires_at: { type: Date, required: true },
  created_at: { type: Date, default: Date.now }
});

export const User = mongoose.model('User', userSchema);
export const Server = mongoose.model('Server', serverSchema);
