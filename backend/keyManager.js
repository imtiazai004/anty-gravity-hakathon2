export function getRandomGeminiKey() {
  const envKeys = process.env.GEMINI_API_KEY;
  if (!envKeys || envKeys === 'YOUR_GEMINI_API_KEY_HERE') {
    return null;
  }
  
  // Split by commas and remove empty spaces
  const keys = envKeys.split(',').map(k => k.trim()).filter(k => k.length > 0);
  
  if (keys.length === 0) return null;
  
  // Randomly pick one of the keys!
  const randomIdx = Math.floor(Math.random() * keys.length);
  const selectedKey = keys[randomIdx];
  
  // Small log so we know rotation is working (showing only last 4 chars for security)
  console.log(`[KeyManager] Using API Key ending in: ...${selectedKey.slice(-4)}`);
  
  return selectedKey;
}
