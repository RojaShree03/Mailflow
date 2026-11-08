import 'dotenv/config';
import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';
export default async function handler(req,res){
  try { await connectDB(); return app(req,res); }
  catch(error){ console.error('Serverless request failed:',error.message); return res.status(503).json({message:'Service temporarily unavailable'}); }
}
