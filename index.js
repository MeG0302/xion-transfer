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
const GAS_FEE = parseInt(process.env.GAS_FEE); // in uxion

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function formatUxionToXion(uxion) {
  return (uxion / 1_000_000).toFixed(6);
}

async function prompt(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function sendTokens(mnemonic, index, receiver, uxionToSend) {
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

    if (uxionToSend > maxSendable) {
      console.log(`⚠️  Wallet #${index + 1} [${account.address}] cannot send ${uxionToSend} uxion (max: ${maxSendable}). Skipping...`);
      return;
    }

    console.log(`\nWallet #${index + 1}: ${account.address}`);
    console.log(`💰 Balance: ${balanceAmount} ${DENOM} (${formatUxionToXion(balanceAmount)} xion)`);

    const fee = {
      amount: coins(GAS_FEE.toString(), DENOM),
      gas: "200000",
    };

    const result = await client.sendTokens(
      account.address,
      receiver,
      coins(uxionToSend.toString(), DENOM),
      fee,
      "Auto transfer"
    );

    console.log(`✅ Sent ${uxionToSend} ${DENOM} (${formatUxionToXion(uxionToSend)} xion) from ${account.address} → ${receiver}`);
  } catch (err) {
    console.error(`❌ Error in wallet #${index + 1}:`, err.message);
  }
}

async function main() {
  const receiver = await prompt("📬 Enter receiver address: ");
  if (!receiver || !receiver.startsWith("xion1")) {
    console.log("❌ Invalid receiver address.");
    rl.close();
    return;
  }

  const xionInput = await prompt("💸 Enter amount to send (in xion): ");
  const xionAmount = parseFloat(xionInput);
  if (isNaN(xionAmount) || xionAmount <= 0) {
    console.log("❌ Invalid amount.");
    rl.close();
    return;
  }

  const uxionToSend = Math.floor(xionAmount * 1_000_000);

  for (let i = 0; i < mnemonics.length; i++) {
    await sendTokens(mnemonics[i], i, receiver, uxionToSend);
  }

  rl.close();
}

main();
