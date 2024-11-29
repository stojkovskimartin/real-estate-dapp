const { ethers } = require("hardhat");
const { realisticWait, checkAndFundAccounts } = require("./setup");

async function main() {
    console.log("🏗️ Welcome to the Enhanced Real Estate NFT Marketplace Simulation 🏗️");
    console.log("========================================================================");

    const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
    const ownerPrivateKey = "OWNER_PRIVATE_KEY"; //REPLACE with #Account 0
    const buyer1PrivateKey = "BUYER_PRIVATE_KEY_1"; //REPLACE with #Account 1
    const buyer2PrivateKey = "BUYER_PRIVATE_KEY_2"; //REPLACE with #Account 2

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
