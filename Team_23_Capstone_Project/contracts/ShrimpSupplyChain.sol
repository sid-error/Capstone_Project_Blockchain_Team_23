// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract ShrimpSupplyChain {
    
    enum LotStatus { Good, Hold, Recall, Destroy }
    enum EntityType { FishingBoat, Warehouse, Factory, Shop, Consumer }
    
    struct Lot {
        string productId;
        string lotCode;
        uint256 quantity;
        address currentOwner;
        LotStatus status;
        string[] parentLots;
        uint256 createdTimestamp;
        string location;
    }
    
    struct Transaction {
        string transactionId;
        address shippingEntityId;
        address receivingEntityId;
        string productId;
        string lotCode;
        uint256 quantity;
        int256 productTemperature;
        uint256 timestamp;
        string shippingLocation;
        string receivingLocation;
    }
    
    struct Entity {
        string name;
        EntityType entityType;
        string location;
        bool isRegistered;
    }
    
    mapping(string => Lot) public lots;
    mapping(string => Transaction[]) public lotTransactions;
    mapping(address => Entity) public entities;
    mapping(string => address[]) public lotHistoryParticipants;
    mapping(address => string[]) public ownerLots;
    
    event EntityRegistered(address entityAddress, string name, EntityType entityType);
    event LotCreated(string productId, string lotCode, uint256 quantity, address owner);
    event LotShipped(string transactionId, string lotCode, address from, address to);
    event LotReceived(string transactionId, string lotCode, address by);
    event LotProcessed(string[] inputLots, string outputLotCode, string productId);
    event LotStatusUpdated(string lotCode, LotStatus newStatus);
    
    modifier onlyRegistered() {
        require(entities[msg.sender].isRegistered, "Entity not registered");
        _;
    }
    
    modifier onlyLotOwner(string memory _lotCode) {
        require(lots[_lotCode].currentOwner == msg.sender, "Not lot owner");
        _;
    }
    
    modifier onlyFishingBoat() {
        require(entities[msg.sender].entityType == EntityType.FishingBoat, "Only fishing boats can create lots");
        _;
    }
    
    modifier notConsumer() {
        require(entities[msg.sender].entityType != EntityType.Consumer, "Consumers cannot perform this action");
        _;
    }
    
    function registerEntity(
        string memory _name,
        EntityType _entityType,
        string memory _location
    ) external {
        require(!entities[msg.sender].isRegistered, "Entity already registered");
        
        entities[msg.sender] = Entity({
            name: _name,
            entityType: _entityType,
            location: _location,
            isRegistered: true
        });
        
        emit EntityRegistered(msg.sender, _name, _entityType);
    }
    
    function createRawMaterialLot(
        string memory _productId,
        string memory _lotCode,
        uint256 _quantity,
        string memory _location
    ) external onlyRegistered onlyFishingBoat {
        require(bytes(lots[_lotCode].lotCode).length == 0, "Lot code already exists");
        
        lots[_lotCode] = Lot({
            productId: _productId,
            lotCode: _lotCode,
            quantity: _quantity,
            currentOwner: msg.sender,
            status: LotStatus.Good,
            parentLots: new string[](0),
            createdTimestamp: block.timestamp,
            location: _location
        });
        
        lotHistoryParticipants[_lotCode].push(msg.sender);
        ownerLots[msg.sender].push(_lotCode);
        
        emit LotCreated(_productId, _lotCode, _quantity, msg.sender);
    }
    
    function shipLot(
        string memory _transactionId,
        address _receivingEntityId,
        string memory _productId,
        string memory _lotCode,
        uint256 _quantity,
        int256 _productTemperature,
        string memory _shippingLocation
    ) external onlyRegistered notConsumer onlyLotOwner(_lotCode) {
        require(entities[_receivingEntityId].isRegistered, "Receiving entity not registered");
        require(entities[_receivingEntityId].entityType != EntityType.Consumer, "Cannot ship to consumer");
        require(lots[_lotCode].quantity >= _quantity, "Insufficient quantity");
        
        // Remove from sender's inventory
        string[] storage senderLots = ownerLots[msg.sender];
        for (uint i = 0; i < senderLots.length; i++) {
            if (keccak256(bytes(senderLots[i])) == keccak256(bytes(_lotCode))) {
                senderLots[i] = senderLots[senderLots.length - 1];
                senderLots.pop();
                break;
            }
        }
        
        Transaction memory newTransaction = Transaction({
            transactionId: _transactionId,
            shippingEntityId: msg.sender,
            receivingEntityId: _receivingEntityId,
            productId: _productId,
            lotCode: _lotCode,
            quantity: _quantity,
            productTemperature: _productTemperature,
            timestamp: block.timestamp,
            shippingLocation: _shippingLocation,
            receivingLocation: entities[_receivingEntityId].location
        });
        
        lotTransactions[_lotCode].push(newTransaction);
        
        // DIRECT TRANSFER - No "in transit" state
        lots[_lotCode].currentOwner = _receivingEntityId;
        lots[_lotCode].location = entities[_receivingEntityId].location;
        
        // Add to receiver's inventory
        ownerLots[_receivingEntityId].push(_lotCode);
        lotHistoryParticipants[_lotCode].push(_receivingEntityId);
        
        emit LotShipped(_transactionId, _lotCode, msg.sender, _receivingEntityId);
    }
    
    function getMyLots() external view returns (string[] memory) {
        return ownerLots[msg.sender];
    }
    
    function getConsumerProvenance(string memory _lotCode) external view returns (
        string memory productId,
        string memory lotCode,
        uint256 createdTimestamp,
        LotStatus status
    ) {
        Lot memory lot = lots[_lotCode];
        require(bytes(lot.lotCode).length > 0, "Lot does not exist");
        return (
            lot.productId,
            lot.lotCode,
            lot.createdTimestamp,
            lot.status
        );
    }
    
    function canViewLotDetails(string memory _lotCode, address _entity) public view returns (bool) {
        // Consumers can only use getConsumerProvenance
        if (entities[_entity].entityType == EntityType.Consumer) {
            return false;
        }
        
        for (uint i = 0; i < lotHistoryParticipants[_lotCode].length; i++) {
            if (lotHistoryParticipants[_lotCode][i] == _entity) {
                return true;
            }
        }
        return false;
    }
    
    function getLotDetails(string memory _lotCode) external view returns (Lot memory) {
        require(canViewLotDetails(_lotCode, msg.sender), "Not authorized to view lot details");
        return lots[_lotCode];
    }
    
    // Admin function to fix stuck lots (one-time use)
    function adminFixLot(string memory _lotCode, address _newOwner) external {
        // Only allow from account 0 for demo purposes
        require(msg.sender == 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266, "Admin only");
        lots[_lotCode].currentOwner = _newOwner;
        ownerLots[_newOwner].push(_lotCode);
    }
}
