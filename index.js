// index.js (ES Module style)
import dotenv from "dotenv";
import fs from "fs";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { SigningStargateClient, coins } from "@cosmjs/stargate";

dotenv.config();

// Read and validate mnemonics
const mnemonics = fs.readFileSync("mnemonics.txt", "utf8")
  .split("\n")
  .map(line => line.trim())
  .filter(line => line.split(" ").length === 12); // Only keep valid 12-word mnemonics

const RPC = process.env.RPC;
const DENOM = process.env.DENOM;
const RECEIVER = process.env.RECEIVER;
const GAS_FEE = parseInt(process.env.GAS_FEE);
const GAS_PRICE = parseFloat(process.env.GAS_PRICE);

async function sendTokens(mnemonic, index) {
  try {
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: "xion" });
    const [account] = await wallet.getAccounts();
    const client = await SigningStargateClient.connectWithSigner(RPC, wallet);

    const balance = await client.getBalance(account.address, DENOM);
    const amountToSend = parseInt(balance.amount) - GAS_FEE;

    if (amountToSend <= 0) {
      console.log(`❌ Wallet #${index + 1} [${account.address}] has insufficient balance.`);
      return;
    }

    const fee = {
      amount: coins(GAS_FEE.toString(), DENOM),
      gas: "200000",
    };

    const result = await client.sendTokens(
      account.address,
      RECEIVER,
      coins(amountToSend.toString(), DENOM),
      fee,
      "Auto transfer"
    );

    console.log(`✅ Sent ${amountToSend} ${DENOM} from ${account.address} → ${RECEIVER}`);
  } catch (err) {
    console.error(`❌ Error in wallet #${index + 1}: ${err.message}`);
  }
}

async function main() {
  for (let i = 0; i < mnemonics.length; i++) {
    await sendTokens(mnemonics[i], i);
  }
}

main();
