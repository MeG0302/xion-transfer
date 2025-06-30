import bip39 from "bip39";
import fs from "fs";

const mnemonics = fs.readFileSync("mnemonics.txt", "utf8")
  .split("\n")
  .map(line => line.trim())
  .filter(line => line.length > 0);

mnemonics.forEach((phrase, index) => {
  const isValid = bip39.validateMnemonic(phrase);
  if (!isValid) {
    console.log(`❌ Wallet #${index + 1} has an invalid mnemonic: "${phrase}"`);
  } else {
    console.log(`✅ Wallet #${index + 1} is valid`);
  }
});
