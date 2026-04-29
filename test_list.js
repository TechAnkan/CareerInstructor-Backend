require('dotenv').config({ override: true });
async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY.trim();
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey);
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
listModels();
