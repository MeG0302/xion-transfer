import dotenv from "dotenv";
import fs from "fs";
import readline from "readline";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { SigningStargateClient, coins } from "@cosmjs/stargate";

dotenv.config();

const mnemonics = fs.readFileSync("mnemonics.txt", "utf8")
  .trim()
  .split("\n")
  .map(line => line.trim())
  .filter(line => line.length > 0);

const RPC = process.env.RPC;
const DENOM = process.env.DENOM;
const RECEIVER = process.env.RECEIVER;
const GAS_FEE = parseInt(process.env.GAS_FEE); // in uxion

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function prompt(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function sendTokens(mnemonic, index) {
  try {
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: "xion" });
    const [account] = await wallet.getAccounts();
    const client = await SigningStargateClient.connectWithSigner(RPC, wallet);

    const balance = await client.getBalance(account.address, DENOM);
    const balanceAmount = parseInt(balance.amount);
    const maxSendable = balanceAmount - GAS_FEE;

    if (maxSendable <= 0) {
      console.log(`⚠️  Wallet #${index + 1} [${account.address}] has insufficient balance.`);
      return;
    }

    console.log(`\nWallet #${index + 1}: ${account.address}`);
    console.log(`💰 Balance: ${balanceAmount} ${DENOM}`);

    const input = await prompt(`👉 How much ${DENOM} do you want to send (max: ${maxSendable})? `);
    const amountToSend = parseInt(input);

    if (isNaN(amountToSend) || amountToSend <= 0 || amountToSend > maxSendable) {
      console.log("❌ Invalid amount. Skipping...");
      return;
    }

    const fee = {
      amount: coins(GAS_FEE.toString(), DENOM),
      gas: "200000",
    };

    const result = await client.sendTokens(account.address, RECEIVER, coins(amountToSend.toString(), DENOM), fee, "Auto transfer");
    console.log(`✅ Sent ${amountToSend} ${DENOM} from ${account.address} → ${RECEIVER}`);
  } catch (err) {
    console.error(`❌ Error in wallet #${index + 1}:`, err.message);
  }
}

async function main() {
  for (let i = 0; i < mnemonics.length; i++) {
    await sendTokens(mnemonics[i], i);
  }
  rl.close();
}

main();
