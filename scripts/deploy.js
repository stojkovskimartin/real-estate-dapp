const { ethers } = require("hardhat");
const { realisticWait, checkAndFundAccounts } = require("./setup");

async function main() {
    console.log("🏗️ Welcome to the Enhanced Real Estate NFT Marketplace Simulation 🏗️");
    console.log("========================================================================");

    const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
    const ownerPrivateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; //REPLACE with #Account 0
    const buyer1PrivateKey = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"; //REPLACE with #Account 1
    const buyer2PrivateKey = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"; //REPLACE with #Account 2

    const owner = new ethers.Wallet(ownerPrivateKey, provider);
    const buyer1 = new ethers.Wallet(buyer1PrivateKey, provider);
    const buyer2 = new ethers.Wallet(buyer2PrivateKey, provider);

    console.log("\n💰 Checking and funding accounts...");
    await checkAndFundAccounts(owner, [buyer1, buyer2], provider);
    await realisticWait(2, 5);

    console.log("\n📄 Deploying RealEstateNFT contract...");
    const RealEstateNFT = await ethers.getContractFactory("RealEstateNFT", owner);
    const realEstateNFT = await RealEstateNFT.deploy();
    await realEstateNFT.deployed();
    console.log(`Contract deployed to: ${realEstateNFT.address}`);
    await realisticWait(2, 4);

    console.log("\n🔐 Setting up roles...");
    const VERIFIER_ROLE = await realEstateNFT.VERIFIER_ROLE();
    await realEstateNFT.grantRole(VERIFIER_ROLE, owner.address);
    console.log("✅ VERIFIER_ROLE granted to owner");
    await realisticWait(2, 4);

    console.log("\n✅ Deployment and setup complete!");
}

main().catch((error) => {
    console.error("❌ An error occurred:", error);
    process.exitCode = 1;
});
