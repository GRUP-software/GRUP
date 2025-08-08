import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file
// This assumes your .env file is in the root of your project
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

if (!PAYSTACK_SECRET_KEY) {
  console.error("Error: PAYSTACK_SECRET_KEY is not set in your .env file.");
  console.error("Please ensure you have a .env file with PAYSTACK_SECRET_KEY=your_secret_key");
  process.exit(1);
}

// --- PASTE YOUR RAW PAYSTACK WEBHOOK BODY HERE ---
// Make sure this is the EXACT raw JSON string you are sending in Postman's body.
// You can copy this from Postman's "Raw" tab for your webhook request.
const rawRequestBody = `{
  "event": "charge.success",
  "data": {
    "reference": "grup_68955aceace85a3d8b848ff0_1754618574704",
    "amount": 100000, 
    "status": "success",
    "metadata": {
      "orderId": "68955aceace85a3d8b848ff0",
      "userId": "68954eeec3b5f15785bdd025"
    }
  }
}`; // IMPORTANT: Ensure this is a single-line string or correctly formatted.

// If you copied a pretty-printed JSON, you might need to parse and then stringify it
// to ensure it matches what Paystack sends (which is usually compact).
// Example:
// const parsedBody = JSON.parse(rawRequestBody);
// const stringifiedBodyForHashing = JSON.stringify(parsedBody);

// For direct raw string hashing, use rawRequestBody directly:
const stringifiedBodyForHashing = rawRequestBody;

const hash = crypto
  .createHmac("sha512", PAYSTACK_SECRET_KEY)
  .update(stringifiedBodyForHashing)
  .digest("hex");

console.log("Generated Paystack Signature (x-paystack-signature):");
console.log(hash);
console.log("\nCopy this value and paste it into the 'x-paystack-signature' header in Postman.");
