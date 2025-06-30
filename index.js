import dotenv from "dotenv";
import fs from "fs";
import readline from "readline";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { SigningStargateClient, coins } from "@cosmjs/stargate";

dotenv.config();

// Read and validate mnemonics
const mnemonics = fs.readFileSync("mnemonics.txt", "utf8")
  .split("\n")
  .map(line => line.trim())
  .filter(line => line.split(" ").length === 12);

const RPC = process.env.RPC;
const DENOM = process.env.DENOM;
const RECEIVER = process.env.RECEIVER;
const GAS_FEE = parseInt(process.env.GAS_FEE);
const GAS_LIMIT = "200000";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Ask user input (wrapped in a Promise)
function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function sendTokens(mnemonic, index) {
  try {
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: "xion" });
    const [account] = await wallet.getAccounts();
    const client = await SigningStargateClient.connectWithSigner(RPC, wallet);

    const balance = await client.getBalance(account.address, DENOM);
    const balanceAmount = parseInt(balance.amount);
    const maxSendable = balanceAmount - GAS_FEE;

    console.log(`\nWallet #${index + 1}: ${account.address}`);
    console.log(`💰 Balance: ${balanceAmount} ${DENOM}`);
    if (maxSendable <= 0) {
      console.log(`❌ Not enough balance to cover gas (${GAS_FEE})`);
      return;
    }

    const input = await askQuestion(`👉 How much ${DENOM} do you want to send (max: ${maxSendable})? `);
    const amountToSend = parseInt(input);

    if (isNaN(amountToSend) || amountToSend <= 0 || amountToSend > maxSendable) {
      console.log(`❌ Invalid amount. Skipping...`);
      return;
    }

    const fee = {
      amount: coins(GAS_FEE.toString(), DENOM),
      gas: GAS_LIMIT,
    };

    const result = await client.sendTokens(
      account.address,
      RECEIVER,
      coins(amountToSend.toString(), DENOM),
      fee,
      "User-defined transfer"
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
  rl.close();
}

main();
