// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;



contract SubnameRegistry {
    
    struct Subname {
        string label;
        string parentEns;
        address owner;
        uint256 challengeId;
        uint256 createdAt;
        uint256 expiresAt;
        bool active;
    }
    
    mapping(bytes32 => Subname) public subnames;
    mapping(address => bytes32[]) public ownerSubnames;
    mapping(uint256 => bytes32) public challengeToSubname;
    
    address public admin;
    
    event SubnameCreated(
        bytes32 indexed subnameHash,
        string label,
        string parentEns,
        address indexed owner,
        uint256 indexed challengeId
    );
    
    event SubnameTransferred(
        bytes32 indexed subnameHash,
        address indexed from,
        address indexed to
    );
    
    event SubnameLinkedToChallenge(
        bytes32 indexed subnameHash,
        uint256 indexed challengeId
    );
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }
    
    constructor() {
        admin = msg.sender;
    }
    
    function createSubname(
        string calldata label,
        string calldata parentEns,
        address owner,
        uint256 challengeId,
        uint256 duration
    ) external returns (bytes32) {
        require(bytes(label).length > 0, "Empty label");
        require(bytes(parentEns).length > 0, "Empty parent ENS");
        require(owner != address(0), "Invalid owner");
        
        bytes32 subnameHash = keccak256(abi.encodePacked(parentEns, ".", label));
        require(!subnames[subnameHash].active, "Subname already exists");
        
        subnames[subnameHash] = Subname({
            label: label,
            parentEns: parentEns,
            owner: owner,
            challengeId: challengeId,
            createdAt: block.timestamp,
            expiresAt: block.timestamp + duration,
            active: true
        });
        
        ownerSubnames[owner].push(subnameHash);
        
        if (challengeId > 0) {
            challengeToSubname[challengeId] = subnameHash;
        }
        
        emit SubnameCreated(subnameHash, label, parentEns, owner, challengeId);
        
        if (challengeId > 0) {
            emit SubnameLinkedToChallenge(subnameHash, challengeId);
        }
        
        return subnameHash;
    }
    
    function getFullSubname(bytes32 subnameHash) external view returns (string memory) {
        Subname memory sub = subnames[subnameHash];
        require(sub.active, "Subname not found");
        return string(abi.encodePacked(sub.label, ".", sub.parentEns));
    }
    
    function subnameExists(string calldata label, string calldata parentEns) external view returns (bool) {
        bytes32 subnameHash = keccak256(abi.encodePacked(parentEns, ".", label));
        return subnames[subnameHash].active && subnames[subnameHash].expiresAt > block.timestamp;
    }
    
    function getSubname(bytes32 subnameHash) external view returns (Subname memory) {
        return subnames[subnameHash];
    }
    
    function getOwnerSubnames(address owner) external view returns (bytes32[] memory) {
        return ownerSubnames[owner];
    }
    
    function getChallengeSubname(uint256 challengeId) external view returns (bytes32) {
        return challengeToSubname[challengeId];
    }
    
    function transferSubname(bytes32 subnameHash, address newOwner) external {
        Subname storage sub = subnames[subnameHash];
        require(sub.active, "Subname not active");
        require(sub.owner == msg.sender, "Not owner");
        require(newOwner != address(0), "Invalid new owner");
        
        address oldOwner = sub.owner;
        sub.owner = newOwner;
        
        ownerSubnames[newOwner].push(subnameHash);
        
        emit SubnameTransferred(subnameHash, oldOwner, newOwner);
    }
    
    function extendSubname(bytes32 subnameHash, uint256 additionalDuration) external {
        Subname storage sub = subnames[subnameHash];
        require(sub.active, "Subname not active");
        require(sub.owner == msg.sender, "Not owner");
        
        sub.expiresAt += additionalDuration;
    }
    
    function setAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Invalid admin");
        admin = newAdmin;
    }
}
