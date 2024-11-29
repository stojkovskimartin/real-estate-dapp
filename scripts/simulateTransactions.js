const { ethers } = require("hardhat");
const { realisticWait, displayListedProperties } = require("./setup");

async function attemptPurchase(contract, buyer, propertyId) {
    try {
        console.log(`Attempting to purchase Property ${propertyId}`);

        const property = await contract.getProperty(propertyId);
        console.log(`Property details: 
            For Sale: ${property.isForSale}, 
            Price: ${ethers.utils.formatEther(property.price)} ETH`);

        // Proceed with purchase
        const buyTx = await contract.connect(buyer).buyProperty(propertyId, {
            value: property.price,
            gasLimit: 500000
        });
        await buyTx.wait();
        console.log(`✅ Property ${propertyId} purchased successfully by ${buyer.address}`);

    } catch (error) {
        console.error(`❌ Error during purchase of Property ${propertyId}:`, error.message);
    }
}

async function attemptPurchaseFailure(contract, buyer, propertyId) {
    try {
        console.log(`Attempting to purchase already sold Property ${propertyId}`);

        const property = await contract.getProperty(propertyId);
        console.log(`Property details: 
            For Sale: ${property.isForSale}, 
            Price: ${ethers.utils.formatEther(property.price)} ETH`);

        console.log(`❌ Cannot purchase Property ${propertyId} as it is not for sale`);

    } catch (error) {
        console.error(`❌ Error checking Property ${propertyId}:`, error.message);
    }
}

async function main() {
    const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
    const buyer1PrivateKey = "BUYER_PRIVATE_KEY_1"; //REPLACE with the #Account 1
    const buyer2PrivateKey = "BUYER_PRIVATE_KEY_2"; //REPLACE with the #Account 2

    const buyer1 = new ethers.Wallet(buyer1PrivateKey, provider);
    const buyer2 = new ethers.Wallet(buyer2PrivateKey, provider);

    const contractAddress = "CONTRACT_ADDRESS"; //REPLACE with actual deployed address
    console.log("Contract address:", contractAddress);

    // Check if the contract exists
    const contractCode = await provider.getCode(contractAddress);
    if (contractCode === '0x') {
        console.error('No contract found at the specified address. Make sure you have deployed the contract and are using the correct address.');
        return;
    }
    console.log("Contract code exists at the specified address.");

    const RealEstateNFT = await ethers.getContractFactory("RealEstateNFT");
    const realEstateNFT = RealEstateNFT.attach(contractAddress);

    // Try to call a simple view function
    try {
        const propertyCount = await realEstateNFT.getPropertyCount();
        console.log("Property count:", propertyCount.toString());
    } catch (error) {
        console.error("Error calling getPropertyCount:", error);
        return; // Exit if we can't even call a simple function
    }

    // Scenario 1: Buyer1 purchases first property
    console.log("\n🏁 Scenario 1: Buyer1 purchases Property 1");
    await attemptPurchase(realEstateNFT, buyer1, 1);
    await realisticWait(2, 4);

    // Scenario 2: Buyer2 purchases second property
    console.log("\n🏁 Scenario 2: Buyer2 purchases Property 2");
    await attemptPurchase(realEstateNFT, buyer2, 2);
    await realisticWait(2, 4);

    // Scenario 3: Attempt to buy already sold first property
    console.log("\n🏁 Scenario 3: Trying to buy already sold Property 1");
    await attemptPurchaseFailure(realEstateNFT, buyer2, 1);
    await realisticWait(2, 4);

    // Final state of properties
    console.log("\n📊 Final state of properties:");
    await displayListedProperties(realEstateNFT);
    await realisticWait(2, 4);

    console.log("\n🎉 Enhanced Real Estate NFT Marketplace Simulation Complete! 🎉");

    console.log("\n💰 Final Account Balances:");
    console.log(`👥 Buyer1: ${ethers.utils.formatEther(await buyer1.getBalance())} ETH`);
    console.log(`👥 Buyer2: ${ethers.utils.formatEther(await buyer2.getBalance())} ETH`);
}

main().catch((error) => {
    console.error("❌ An error occurred:", error);
    process.exitCode = 1;
});