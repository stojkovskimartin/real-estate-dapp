const { ethers } = require("hardhat");
const { realisticWait, displayListedProperties } = require("./setup");

async function main() {
    const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
    const ownerPrivateKey = "OWNER_PRIVATE_KEY"; //REPLACE with #Account 0
    const owner = new ethers.Wallet(ownerPrivateKey, provider);

    const contractAddress = "CONTRACT_ADDRESS"; //REPLACE with actual deployed address
    console.log(`\n📄 Interacting with RealEstateNFT contract at: ${contractAddress}`);
    await realisticWait(2, 4);

    const RealEstateNFT = await ethers.getContractFactory("RealEstateNFT", owner);
    const realEstateNFT = RealEstateNFT.attach(contractAddress);

    // Check if the contract is deployed
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
        console.error("Contract is not deployed at the specified address");
        return;
    }

    const properties = [
        { location: "Bahnhofstrasse 15, 8001 Zürich, Switzerland", squareMeters: 150, price: "145", rooms: 3 },
        { location: "Rue du Rhône 62, 1204 Geneva, Switzerland", squareMeters: 200, price: "210", rooms: 5 },
        { location: "Via Nassa 5, 6900 Lugano, Switzerland", squareMeters: 100, price: "125", rooms: 4 }
    ];

    const propertyIds = [];

    // Create, list, and verify properties
    for (let i = 0; i < properties.length; i++) {
        console.log(`\n🏠 Creating property ${i + 1}...`);
        try {
            const createTx = await realEstateNFT.createProperty(
                properties[i].location,
                properties[i].squareMeters,
                ethers.utils.parseEther(properties[i].price),
                "https://example.com/token-uri",
                {gasLimit: 500000}
            );
            console.log("Transaction hash:", createTx.hash);
            const receipt = await createTx.wait();
            console.log("Transaction receipt:", receipt);

            const propertyListedEvent = receipt.events.find(e => e.event === 'PropertyListed');
            if (propertyListedEvent) {
                const propertyId = propertyListedEvent.args.propertyId;
                propertyIds.push(propertyId);
                console.log(`Property created with ID: ${propertyId}`);
            } else {
                console.error("PropertyListed event not found in transaction receipt");
            }

            console.log(`\n📝 Listing property for sale...`);
            const listTx = await realEstateNFT.listPropertyForSale(
                propertyIds[i],
                ethers.utils.parseEther(properties[i].price),
                {gasLimit: 500000}
            );
            await listTx.wait();

            console.log(`\n✅ Verifying property...`);
            const verifyTx = await realEstateNFT.verifyProperty(propertyIds[i], {gasLimit: 500000});
            await verifyTx.wait();

        } catch (error) {
            console.error(`Error processing property ${i + 1}:`, error);
        }

        await realisticWait(2, 4);
    }

    console.log("\n📊 Current listed properties:");
    await displayListedProperties(realEstateNFT);
    await realisticWait(2, 4);

    console.log("\n✅ Properties created and listed successfully!");
}

main().catch((error) => {
    console.error("❌ An error occurred:", error);
    process.exitCode = 1;
});