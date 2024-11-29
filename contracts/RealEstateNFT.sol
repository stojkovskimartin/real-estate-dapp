// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";

contract RealEstateNFT is ERC721URIStorage, AccessControl, ReentrancyGuard, Pausable {
    using Counters for Counters.Counter;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    address public contractAdmin;

    Counters.Counter private _propertyIds;
    uint256 public platformFee = 1; // 0.1% fee
    uint256 public constant FEE_DENOMINATOR = 1000;

    struct Property {
        uint256 id;
        address owner;
        uint256 price;
        string location;
        uint256 squareMeters;
        bool isForSale;
        bool isVerified;
        uint256 createdAt;
        uint256 lastUpdated;
    }

    mapping(uint256 => Property) public properties;
    mapping(address => uint256[]) public userProperties;

    event PropertyListed(uint256 indexed propertyId, address indexed owner, uint256 price);
    event PropertySold(uint256 indexed propertyId, address indexed oldOwner, address indexed newOwner, uint256 price);
    event PropertyPriceChanged(uint256 indexed propertyId, uint256 newPrice);
    event PropertyVerified(uint256 indexed propertyId, address indexed verifier);
    event PlatformFeeUpdated(uint256 newFee);
    event ContractPaused(address account);
    event ContractUnpaused(address account);

    constructor() ERC721("RealEstateNFT", "RENFT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        contractAdmin = msg.sender;
    }

    function createProperty(
        string memory _location,
        uint256 _squareMeters,
        uint256 _price,
        string memory _tokenURI
    ) external whenNotPaused returns (uint256) {
        _propertyIds.increment();
        uint256 newPropertyId = _propertyIds.current();

        _safeMint(msg.sender, newPropertyId);
        _setTokenURI(newPropertyId, _tokenURI);

        properties[newPropertyId] = Property({
            id: newPropertyId,
            owner: msg.sender,
            price: _price,
            location: _location,
            squareMeters: _squareMeters,
            isForSale: true,
            isVerified: false,
            createdAt: block.timestamp,
            lastUpdated: block.timestamp
        });

        userProperties[msg.sender].push(newPropertyId);

        emit PropertyListed(newPropertyId, msg.sender, _price);

        return newPropertyId;
    }

    function getPropertyCount() public view returns (uint256) {
        return _propertyIds.current();
    }

    function buyProperty(uint256 _propertyId) external payable nonReentrant whenNotPaused {
        Property storage property = properties[_propertyId];
        require(property.isForSale, "Property not listed for sale");
        require(property.isVerified, "Property must be verified before purchase");
        require(msg.value >= property.price, "Insufficient payment amount");
        require(msg.sender != property.owner, "Owners cannot purchase their property");

        address payable seller = payable(property.owner);
        uint256 fee = (property.price * platformFee) / FEE_DENOMINATOR;
        uint256 sellerAmount = property.price - fee;

        seller.transfer(sellerAmount);
        payable(getContractAdmin()).transfer(fee);

        _transfer(seller, msg.sender, _propertyId);
        property.owner = msg.sender;
        property.isForSale = false;
        property.lastUpdated = block.timestamp;

        _updateUserProperties(seller, msg.sender, _propertyId);

        emit PropertySold(_propertyId, seller, msg.sender, msg.value);
    }

    function listPropertyForSale(uint256 _propertyId, uint256 _newPrice) external whenNotPaused {
        require(ownerOf(_propertyId) == msg.sender, "Only property owner can list it for sale");
        properties[_propertyId].isForSale = true;
        properties[_propertyId].price = _newPrice;
        properties[_propertyId].lastUpdated = block.timestamp;

        emit PropertyListed(_propertyId, msg.sender, _newPrice);
    }

    function changePropertyPrice(uint256 _propertyId, uint256 _newPrice) external whenNotPaused {
        require(ownerOf(_propertyId) == msg.sender, "Only property owner can change price");
        require(properties[_propertyId].isForSale, "Property is not listed for sale");
        properties[_propertyId].price = _newPrice;
        properties[_propertyId].lastUpdated = block.timestamp;

        emit PropertyPriceChanged(_propertyId, _newPrice);
    }

    function verifyProperty(uint256 _propertyId) external onlyRole(VERIFIER_ROLE) whenNotPaused {
        require(!properties[_propertyId].isVerified, "Property already verified");
        properties[_propertyId].isVerified = true;
        properties[_propertyId].lastUpdated = block.timestamp;

        emit PropertyVerified(_propertyId, msg.sender);
    }

    function getProperty(uint256 _propertyId) external view returns (Property memory) {
        return properties[_propertyId];
    }

    function getUserProperties(address _user) external view returns (uint256[] memory) {
        return userProperties[_user];
    }

    function setPlatformFee(uint256 _newFee) external onlyRole(ADMIN_ROLE) {
        require(_newFee <= 100, "Fee cannot exceed 10%");
        platformFee = _newFee;
        emit PlatformFeeUpdated(_newFee);
    }

    function withdrawFunds() external onlyRole(ADMIN_ROLE) {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        payable(contractAdmin).transfer(balance);
    }

    // Function to receive Ether. msg.data must be empty
    receive() external payable {}

    // Fallback function is called when msg.data is not empty
    fallback() external payable {}

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
        emit ContractPaused(msg.sender);
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
        emit ContractUnpaused(msg.sender);
    }

    function getContractAdmin() public view returns (address) {
        return contractAdmin;
    }

    function _updateUserProperties(address from, address to, uint256 propertyId) internal {
        removeFromUserProperties(from, propertyId);
        userProperties[to].push(propertyId);
    }

    function removeFromUserProperties(address user, uint256 propertyId) internal {
        uint256[] storage userProps = userProperties[user];
        for (uint i = 0; i < userProps.length; i++) {
            if (userProps[i] == propertyId) {
                userProps[i] = userProps[userProps.length - 1];
                userProps.pop();
                break;
            }
        }
    }

    function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC721URIStorage, AccessControl)
    returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}