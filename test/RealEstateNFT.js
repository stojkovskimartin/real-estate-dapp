const {expect} = require("chai");
const {ethers} = require("hardhat");

describe("RealEstateNFT", function () {
    let RealEstateNFT, realEstateNFT, owner, admin, verifier, buyer, seller;
    const ADMIN_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ADMIN_ROLE"));
    const VERIFIER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("VERIFIER_ROLE"));

    beforeEach(async function () {
        [owner, admin, verifier, buyer, seller] = await ethers.getSigners();
        RealEstateNFT = await ethers.getContractFactory("RealEstateNFT");
        realEstateNFT = await RealEstateNFT.deploy();
        await realEstateNFT.deployed();

        await realEstateNFT.grantRole(ADMIN_ROLE, admin.address);
        await realEstateNFT.grantRole(VERIFIER_ROLE, verifier.address);
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await realEstateNFT.hasRole(ethers.constants.HashZero, owner.address)).to.be.true;
        });

        it("Should set the right admin", async function () {
            expect(await realEstateNFT.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
        });

        it("Should set the right verifier", async function () {
            expect(await realEstateNFT.hasRole(VERIFIER_ROLE, verifier.address)).to.be.true;
        });
    });

    describe("Property Creation", function () {
        it("Should create a new property", async function () {
            await expect(realEstateNFT.createProperty("New York", 100, ethers.utils.parseEther("1"), "ipfs://tokenURI"))
                .to.emit(realEstateNFT, "PropertyListed")
                .withArgs(1, owner.address, ethers.utils.parseEther("1"));

            const property = await realEstateNFT.getProperty(1);
            expect(property.owner).to.equal(owner.address);
            expect(property.location).to.equal("New York");
            expect(property.squareMeters).to.equal(100);
            expect(property.price).to.equal(ethers.utils.parseEther("1"));
            expect(property.isForSale).to.be.true;
            expect(property.isVerified).to.be.false;
        });

        it("Should increment property count", async function () {
            await realEstateNFT.createProperty("New York", 100, ethers.utils.parseEther("1"), "ipfs://tokenURI");
            expect(await realEstateNFT.getPropertyCount()).to.equal(1);
        });
    });

    describe("Property Purchase", function () {
        beforeEach(async function () {
            await realEstateNFT.createProperty("New York", 100, ethers.utils.parseEther("1"), "ipfs://tokenURI");
            await realEstateNFT.connect(verifier).verifyProperty(1);
        });

        it("Should allow buying a property", async function () {
            await expect(realEstateNFT.connect(buyer).buyProperty(1, {value: ethers.utils.parseEther("1")}))
                .to.emit(realEstateNFT, "PropertySold")
                .withArgs(1, owner.address, buyer.address, ethers.utils.parseEther("1"));

            const property = await realEstateNFT.getProperty(1);
            expect(property.owner).to.equal(buyer.address);
            expect(property.isForSale).to.be.false;
        });

        it("Should not allow buying an unverified property", async function () {
            await realEstateNFT.createProperty("London", 200, ethers.utils.parseEther("2"), "ipfs://tokenURI2");
            await expect(realEstateNFT.connect(buyer).buyProperty(2, {value: ethers.utils.parseEther("2")}))
                .to.be.revertedWith("Property must be verified before purchase");
        });

        it("Should not allow buying with insufficient funds", async function () {
            await expect(realEstateNFT.connect(buyer).buyProperty(1, {value: ethers.utils.parseEther("0.5")}))
                .to.be.revertedWith("Insufficient payment amount");
        });

        it("Should not allow owner to buy their own property", async function () {
            await expect(realEstateNFT.buyProperty(1, {value: ethers.utils.parseEther("1")}))
                .to.be.revertedWith("Owners cannot purchase their property");
        });
    });

    describe("Property Listing", function () {
        beforeEach(async function () {
            await realEstateNFT.createProperty("New York", 100, ethers.utils.parseEther("1"), "ipfs://tokenURI");
        });

        it("Should allow owner to list property for sale", async function () {
            await expect(realEstateNFT.listPropertyForSale(1, ethers.utils.parseEther("2")))
                .to.emit(realEstateNFT, "PropertyListed")
                .withArgs(1, owner.address, ethers.utils.parseEther("2"));

            const property = await realEstateNFT.getProperty(1);
            expect(property.isForSale).to.be.true;
            expect(property.price).to.equal(ethers.utils.parseEther("2"));
        });

        it("Should not allow non-owner to list property for sale", async function () {
            await expect(realEstateNFT.connect(buyer).listPropertyForSale(1, ethers.utils.parseEther("2")))
                .to.be.revertedWith("Only property owner can list it for sale");
        });
    });

    describe("Property Price Change", function () {
        beforeEach(async function () {
            await realEstateNFT.createProperty("New York", 100, ethers.utils.parseEther("1"), "ipfs://tokenURI");
        });

        it("Should allow owner to change property price", async function () {
            await expect(realEstateNFT.changePropertyPrice(1, ethers.utils.parseEther("2")))
                .to.emit(realEstateNFT, "PropertyPriceChanged")
                .withArgs(1, ethers.utils.parseEther("2"));

            const property = await realEstateNFT.getProperty(1);
            expect(property.price).to.equal(ethers.utils.parseEther("2"));
        });

        it("Should not allow non-owner to change property price", async function () {
            await expect(realEstateNFT.connect(buyer).changePropertyPrice(1, ethers.utils.parseEther("2")))
                .to.be.revertedWith("Only property owner can change price");
        });
    });

    describe("Property Verification", function () {
        beforeEach(async function () {
            await realEstateNFT.createProperty("New York", 100, ethers.utils.parseEther("1"), "ipfs://tokenURI");
        });

        it("Should allow verifier to verify property", async function () {
            await expect(realEstateNFT.connect(verifier).verifyProperty(1))
                .to.emit(realEstateNFT, "PropertyVerified")
                .withArgs(1, verifier.address);

            const property = await realEstateNFT.getProperty(1);
            expect(property.isVerified).to.be.true;
        });

        it("Should not allow non-verifier to verify property", async function () {
            await expect(realEstateNFT.connect(buyer).verifyProperty(1))
                .to.be.revertedWith("AccessControl: account " + buyer.address.toLowerCase() + " is missing role " + VERIFIER_ROLE);
        });

        it("Should not allow verifying an already verified property", async function () {
            await realEstateNFT.connect(verifier).verifyProperty(1);
            await expect(realEstateNFT.connect(verifier).verifyProperty(1))
                .to.be.revertedWith("Property already verified");
        });
    });

    describe("Platform Fee", function () {
        it("Should allow admin to set platform fee", async function () {
            await expect(realEstateNFT.connect(admin).setPlatformFee(20))
                .to.emit(realEstateNFT, "PlatformFeeUpdated")
                .withArgs(20);

            expect(await realEstateNFT.platformFee()).to.equal(20);
        });

        it("Should not allow non-admin to set platform fee", async function () {
            await expect(realEstateNFT.connect(buyer).setPlatformFee(20))
                .to.be.revertedWith("AccessControl: account " + buyer.address.toLowerCase() + " is missing role " + ADMIN_ROLE);
        });

        it("Should not allow setting fee above 10%", async function () {
            await expect(realEstateNFT.connect(admin).setPlatformFee(101))
                .to.be.revertedWith("Fee cannot exceed 10%");
        });
    });

    describe("Funds Withdrawal", function () {
        it("Should not allow non-admin to withdraw funds", async function () {
            await expect(realEstateNFT.connect(buyer).withdrawFunds())
                .to.be.revertedWith("AccessControl: account " + buyer.address.toLowerCase() + " is missing role " + ADMIN_ROLE);
        });
    });

    describe("Pause and Unpause", function () {
        it("Should allow admin to pause the contract", async function () {
            await expect(realEstateNFT.connect(admin).pause())
                .to.emit(realEstateNFT, "ContractPaused")
                .withArgs(admin.address);

            await expect(realEstateNFT.createProperty("New York", 100, ethers.utils.parseEther("1"), "ipfs://tokenURI"))
                .to.be.revertedWith("Pausable: paused");
        });

        it("Should allow admin to unpause the contract", async function () {
            await realEstateNFT.connect(admin).pause();
            await expect(realEstateNFT.connect(admin).unpause())
                .to.emit(realEstateNFT, "ContractUnpaused")
                .withArgs(admin.address);

            await expect(realEstateNFT.createProperty("New York", 100, ethers.utils.parseEther("1"), "ipfs://tokenURI"))
                .to.not.be.reverted;
        });

        it("Should not allow non-admin to pause or unpause", async function () {
            await expect(realEstateNFT.connect(buyer).pause())
                .to.be.revertedWith("AccessControl: account " + buyer.address.toLowerCase() + " is missing role " + ADMIN_ROLE);

            await expect(realEstateNFT.connect(buyer).unpause())
                .to.be.revertedWith("AccessControl: account " + buyer.address.toLowerCase() + " is missing role " + ADMIN_ROLE);
        });
    });

    describe("User Properties", function () {
        it("Should correctly track user properties", async function () {
            await realEstateNFT.createProperty("New York", 100, ethers.utils.parseEther("1"), "ipfs://tokenURI");
            await realEstateNFT.createProperty("London", 200, ethers.utils.parseEther("2"), "ipfs://tokenURI2");

            let userProps = await realEstateNFT.getUserProperties(owner.address);
            expect(userProps.length).to.equal(2);
            expect(userProps[0]).to.equal(1);
            expect(userProps[1]).to.equal(2);

            await realEstateNFT.connect(verifier).verifyProperty(1);
            await realEstateNFT.connect(buyer).buyProperty(1, {value: ethers.utils.parseEther("1")});

            userProps = await realEstateNFT.getUserProperties(owner.address);
            expect(userProps.length).to.equal(1);
            expect(userProps[0]).to.equal(2);

            userProps = await realEstateNFT.getUserProperties(buyer.address);
            expect(userProps.length).to.equal(1);
            expect(userProps[0]).to.equal(1);
        });
    });

    describe("Interface Support", function () {
        it("Should support ERC721 and AccessControl interfaces", async function () {
            expect(await realEstateNFT.supportsInterface("0x80ac58cd")).to.be.true; // ERC721
            expect(await realEstateNFT.supportsInterface("0x7965db0b")).to.be.true; // AccessControl
        });
    });
});