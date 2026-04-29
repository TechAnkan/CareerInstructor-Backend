require('dotenv').config({ override: true });
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim());
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
model.generateContent('hi').then(res => console.log('1.5-flash worked')).catch(err => console.log('1.5-flash FAILED', err.message));
const model2 = genAI.getGenerativeModel({ model: 'gemini-pro' });
model2.generateContent('hi').then(res => console.log('gemini-pro worked')).catch(err => console.log('gemini-pro FAILED', err.message));
const model3 = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
model3.generateContent('hi').then(res => console.log('1.5-flash-latest worked')).catch(err => console.log('1.5-flash-latest FAILED', err.message));
