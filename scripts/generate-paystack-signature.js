import crypto from "crypto"
import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"

// Load environment variables from .env file
// This assumes your .env file is in the root of your project
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, "../.env") })

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY

if (!PAYSTACK_SECRET_KEY) {
  console.error("Error: PAYSTACK_SECRET_KEY is not set in your .env file.")
  console.error("Please ensure you have a .env file with PAYSTACK_SECRET_KEY=your_secret_key")
  process.exit(1)
}

// --- PASTE YOUR RAW PAYSTACK WEBHOOK BODY HERE ---
// Make sure this is the EXACT raw JSON string you are sending in Postman's body.
// You can copy this from Postman's "Raw" tab for your webhook request.
const rawRequestBody = `{"event":"charge.success","data":{"reference":"GRP_mZGa5PMR3L_1754854129264","amount":3000,"status":"success","metadata":{"userId":"6898ecc4bb8268f38779e255","paymentHistoryId":"6898f2f15139b9798cfa5173"}}}`

// For direct raw string hashing, use rawRequestBody directly:
const stringifiedBodyForHashing = rawRequestBody

const hash = crypto.createHmac("sha512", PAYSTACK_SECRET_KEY).update(stringifiedBodyForHashing).digest("hex")

console.log("Generated Paystack Signature (x-paystack-signature):")
console.log(hash)
console.log("\nCopy this value and paste it into the 'x-paystack-signature' header in Postman.")
console.log("\nIMPORTANT: Make sure your Postman body is EXACTLY:")
console.log(rawRequestBody)
