const { ethers } = require("hardhat");

// Realistic timing function
async function realisticWait(minSeconds, maxSeconds) {
    const waitTime = Math.floor(Math.random() * (maxSeconds - minSeconds + 1) + minSeconds) * 1000;
    console.log(`⏳ Waiting ${waitTime/1000} seconds...`);
    return new Promise(resolve => setTimeout(resolve, waitTime));
}

async function checkAndFundAccounts(owner, buyers, provider) {
    console.log("Account Balances:");
    console.log(`👤 Owner: ${ethers.utils.formatEther(await owner.getBalance())} ETH`);

    for (let i = 0; i < buyers.length; i++) {
        const balance = await buyers[i].getBalance();
        console.log(`👥 Buyer${i + 1}: ${ethers.utils.formatEther(balance)} ETH`);

        if (balance.lt(ethers.utils.parseEther("1"))) {
            console.log(`💸 Funding Buyer${i + 1} account...`);
            await owner.sendTransaction({
                to: buyers[i].address,
                value: ethers.utils.parseEther("1")
            });
            console.log(`✅ Buyer${i + 1} account funded with 1 ETH`);
        }
    }
}

async function displayListedProperties(contract) {
    const propertyCount = await contract.getPropertyCount();
    for (let i = 1; i <= propertyCount; i++) {
        try {
            const property = await contract.getProperty(i);
            console.log(`Property ${i}:`);
            console.log(` Location: ${property.location}`);
            console.log(` Price: ${ethers.utils.formatEther(property.price)} ETH`);
            console.log(` For Sale: ${property.isForSale}`);
            console.log(` Owner: ${property.owner}`);
            console.log("---");
        } catch (error) {
            console.error(`Error fetching property ${i}:`, error.message);
        }
    }
}

module.exports = {
    realisticWait,
    checkAndFundAccounts,
    displayListedProperties
};

console.log("✅ Setup completed successfully");

