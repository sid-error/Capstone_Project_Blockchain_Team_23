import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';

// Import contract data
import contractAddress from './contractAddress.json';
import contractABI from './contractABI.json';

// Entity types for dropdowns
const ENTITY_TYPES = [
  'FishingBoat',
  'Warehouse',
  'Manufacturer',
  'Store',
  'Consumer'
];

const LOT_STATUS = ['Good', 'Hold', 'Recall', 'Destroy'];

function App() {
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState<any>(null);
  const [userRole, setUserRole] = useState('consumer');
  const [activeSupplierTab, setActiveSupplierTab] = useState('register');
  const [lotCode, setLotCode] = useState('');
  const [lotInfo, setLotInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Supplier states
  const [entityName, setEntityName] = useState('');
  const [entityType, setEntityType] = useState(0);
  const [entityLocation, setEntityLocation] = useState('');
  const [myLots, setMyLots] = useState<string[]>([]);
  const [lotDetails, setLotDetails] = useState<any>({});
  const [showCreateLotForm, setShowCreateLotForm] = useState(false);
  const [showShipForm, setShowShipForm] = useState(false);
  const [selectedLot, setSelectedLot] = useState('');

  // Form states
  const [newLot, setNewLot] = useState({
    productId: '',
    lotCode: '',
    quantity: '',
    location: ''
  });
  const [shipment, setShipment] = useState({
    transactionId: '',
    receiver: '',
    productId: '',
    lotCode: '',
    quantity: '',
    temperature: '',
    location: ''
  });

  useEffect(() => {
    loadBlockchainData();
  }, []);

  const loadBlockchainData = async () => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setAccount(address);
        
        const shrimpContract = new ethers.Contract(
          contractAddress.address,
          contractABI.abi,
          signer
        );
        setContract(shrimpContract);
      } catch (error) {
        console.error("Error connecting to MetaMask:", error);
      }
    }
  };

  const trackProduct = async () => {
    if (!contract || !lotCode) return;
    
    setLoading(true);
    try {
      const provenance = await contract.getConsumerProvenance(lotCode);
      setLotInfo(provenance);
    } catch (error) {
      console.error("Error tracking product:", error);
      alert("Product not found or error retrieving data");
    }
    setLoading(false);
  };

  // Supplier Functions
  const registerEntity = async () => {
    if (!contract || !entityName || !entityLocation) return;
    
    try {
      const tx = await contract.registerEntity(entityName, entityType, entityLocation);
      await tx.wait();
      alert('Entity registered successfully!');
      setEntityName('');
      setEntityLocation('');
    } catch (error) {
      console.error("Error registering entity:", error);
      alert("Error registering entity");
    }
  };

  const createRawMaterialLot = async () => {
    if (!contract || !newLot.productId || !newLot.lotCode || !newLot.quantity) return;
    
    try {
      const tx = await contract.createRawMaterialLot(
        newLot.productId,
        newLot.lotCode,
        newLot.quantity,
        newLot.location
      );
      await tx.wait();
      alert('Lot created successfully!');
      setNewLot({ productId: '', lotCode: '', quantity: '', location: '' });
      setShowCreateLotForm(false);
      loadMyLots();
    } catch (error) {
      console.error("Error creating lot:", error);
      alert("Error creating lot");
    }
  };

  const loadMyLots = async () => {
    if (!contract) return;
    
    try {
      const lots = await contract.getMyLots();
      setMyLots(lots);
      
      // Load details for each lot
      const details: any = {};
      for (const lotCode of lots) {
        try {
          const detail = await contract.getLotDetails(lotCode);
          details[lotCode] = detail;
        } catch (error) {
          console.error(`Error loading details for ${lotCode}:`, error);
        }
      }
      setLotDetails(details);
    } catch (error) {
      console.error("Error loading lots:", error);
    }
  };

  const shipLot = async () => {
    if (!contract || !shipment.transactionId || !shipment.receiver || !shipment.lotCode) return;
    
    try {
      const tx = await contract.shipLot(
        shipment.transactionId,
        shipment.receiver,
        shipment.productId,
        shipment.lotCode,
        shipment.quantity || '0',
        shipment.temperature || '0',
        shipment.location
      );
      await tx.wait();
      alert('Lot shipped successfully!');
      setShipment({
        transactionId: '',
        receiver: '',
        productId: '',
        lotCode: '',
        quantity: '',
        temperature: '',
        location: ''
      });
      setShowShipForm(false);
      loadMyLots();
    } catch (error) {
      console.error("Error shipping lot:", error);
      alert("Error shipping lot");
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>?? ShrimpTrace</h1>
        <p>Blockchain Supply Chain Transparency</p>
        <div className="account-info">
          {account ? `Connected: ${account.slice(0, 6)}...${account.slice(-4)}` : 'Not Connected'}
        </div>
      </header>

      <nav className="role-nav">
        <button 
          className={userRole === 'consumer' ? 'active' : ''}
          onClick={() => setUserRole('consumer')}
        >
          Consumer
        </button>
        <button 
          className={userRole === 'supplier' ? 'active' : ''}
          onClick={() => {
            setUserRole('supplier');
            loadMyLots();
          }}
        >
          Supplier Portal
        </button>
      </nav>

      <main className="main-content">
        {userRole === 'consumer' ? (
          <div className="consumer-interface">
            <h2>Track Your Shrimp Product</h2>
            <div className="tracking-form">
              <input
                type="text"
                placeholder="Enter Lot Code (e.g., SH001)"
                value={lotCode}
                onChange={(e) => setLotCode(e.target.value)}
              />
              <button onClick={trackProduct} disabled={loading}>
                {loading ? 'Tracking...' : 'Track Product'}
              </button>
            </div>

            {lotInfo && (
              <div className="product-info">
                <h3>Product Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Product ID:</label>
                    <span>{lotInfo.productId}</span>
                  </div>
                  <div className="info-item">
                    <label>Lot Code:</label>
                    <span>{lotInfo.lotCode}</span>
                  </div>
                  <div className="info-item">
                    <label>Production Date:</label>
                    <span>{new Date(Number(lotInfo.createdTimestamp) * 1000).toLocaleDateString()}</span>
                  </div>
                  <div className="info-item">
                    <label>Status:</label>
                    <span className={`status-${lotInfo.status}`}>
                      {LOT_STATUS[lotInfo.status]}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="supplier-interface">
            <h2>Supplier Portal</h2>
            
            <div className="supplier-tabs">
              <button 
                className={activeSupplierTab === 'register' ? 'active' : ''}
                onClick={() => setActiveSupplierTab('register')}
              >
                Register Entity
              </button>
              <button 
                className={activeSupplierTab === 'inventory' ? 'active' : ''}
                onClick={() => {
                  setActiveSupplierTab('inventory');
                  loadMyLots();
                }}
              >
                My Inventory
              </button>
              <button 
                className={activeSupplierTab === 'create' ? 'active' : ''}
                onClick={() => setActiveSupplierTab('create')}
              >
                Create Lot
              </button>
              <button 
                className={activeSupplierTab === 'ship' ? 'active' : ''}
                onClick={() => setActiveSupplierTab('ship')}
              >
                Ship Lot
              </button>
            </div>

            {activeSupplierTab === 'register' && (
              <div className="supplier-form">
                <h3>Register Your Entity</h3>
                <div className="form-group">
                  <label>Entity Name:</label>
                  <input
                    type="text"
                    value={entityName}
                    onChange={(e) => setEntityName(e.target.value)}
                    placeholder="e.g., Ocean Fisher"
                  />
                </div>
                <div className="form-group">
                  <label>Entity Type:</label>
                  <select value={entityType} onChange={(e) => setEntityType(parseInt(e.target.value))}>
                    {ENTITY_TYPES.map((type, index) => (
                      <option key={index} value={index}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Location:</label>
                  <input
                    type="text"
                    value={entityLocation}
                    onChange={(e) => setEntityLocation(e.target.value)}
                    placeholder="e.g., Pacific Ocean"
                  />
                </div>
                <button onClick={registerEntity} className="action-button">
                  Register Entity
                </button>
              </div>
            )}

            {activeSupplierTab === 'inventory' && (
              <div className="inventory-section">
                <h3>My Inventory</h3>
                <button onClick={loadMyLots} className="refresh-button">
                  Refresh Inventory
                </button>
                <div className="lots-grid">
                  {myLots.map((lotCode, index) => (
                    <div key={index} className="lot-card">
                      <h4>Lot: {lotCode}</h4>
                      {lotDetails[lotCode] && (
                        <>
                          <p>Product: {lotDetails[lotCode].productId}</p>
                          <p>Quantity: {lotDetails[lotCode].quantity.toString()}</p>
                          <p>Status: {LOT_STATUS[lotDetails[lotCode].status]}</p>
                          <p>Location: {lotDetails[lotCode].location}</p>
                        </>
                      )}
                      <button 
                        onClick={() => {
                          setSelectedLot(lotCode);
                          setShipment(prev => ({ ...prev, lotCode, productId: lotDetails[lotCode]?.productId || '' }));
                          setActiveSupplierTab('ship');
                        }}
                        className="action-button small"
                      >
                        Ship This Lot
                      </button>
                    </div>
                  ))}
                  {myLots.length === 0 && <p>No lots found. Create your first lot!</p>}
                </div>
              </div>
            )}

            {activeSupplierTab === 'create' && (
              <div className="supplier-form">
                <h3>Create Raw Material Lot</h3>
                <div className="form-group">
                  <label>Product ID:</label>
                  <input
                    type="text"
                    value={newLot.productId}
                    onChange={(e) => setNewLot({...newLot, productId: e.target.value})}
                    placeholder="e.g., RAW_SHRIMP"
                  />
                </div>
                <div className="form-group">
                  <label>Lot Code:</label>
                  <input
                    type="text"
                    value={newLot.lotCode}
                    onChange={(e) => setNewLot({...newLot, lotCode: e.target.value})}
                    placeholder="e.g., SH001"
                  />
                </div>
                <div className="form-group">
                  <label>Quantity:</label>
                  <input
                    type="number"
                    value={newLot.quantity}
                    onChange={(e) => setNewLot({...newLot, quantity: e.target.value})}
                    placeholder="e.g., 1000"
                  />
                </div>
                <div className="form-group">
                  <label>Location:</label>
                  <input
                    type="text"
                    value={newLot.location}
                    onChange={(e) => setNewLot({...newLot, location: e.target.value})}
                    placeholder="e.g., Pacific Ocean"
                  />
                </div>
                <button onClick={createRawMaterialLot} className="action-button">
                  Create Lot
                </button>
              </div>
            )}

            {activeSupplierTab === 'ship' && (
              <div className="supplier-form">
                <h3>Ship Lot to Another Entity</h3>
                <div className="form-group">
                  <label>Transaction ID:</label>
                  <input
                    type="text"
                    value={shipment.transactionId}
                    onChange={(e) => setShipment({...shipment, transactionId: e.target.value})}
                    placeholder="e.g., TX001"
                  />
                </div>
                <div className="form-group">
                  <label>Receiver Address:</label>
                  <input
                    type="text"
                    value={shipment.receiver}
                    onChange={(e) => setShipment({...shipment, receiver: e.target.value})}
                    placeholder="0x..."
                  />
                </div>
                <div className="form-group">
                  <label>Product ID:</label>
                  <input
                    type="text"
                    value={shipment.productId}
                    onChange={(e) => setShipment({...shipment, productId: e.target.value})}
                    placeholder="e.g., RAW_SHRIMP"
                  />
                </div>
                <div className="form-group">
                  <label>Lot Code:</label>
                  <input
                    type="text"
                    value={shipment.lotCode}
                    onChange={(e) => setShipment({...shipment, lotCode: e.target.value})}
                    placeholder="e.g., SH001"
                  />
                </div>
                <div className="form-group">
                  <label>Quantity:</label>
                  <input
                    type="number"
                    value={shipment.quantity}
                    onChange={(e) => setShipment({...shipment, quantity: e.target.value})}
                    placeholder="e.g., 1000"
                  />
                </div>
                <div className="form-group">
                  <label>Temperature (�C):</label>
                  <input
                    type="number"
                    value={shipment.temperature}
                    onChange={(e) => setShipment({...shipment, temperature: e.target.value})}
                    placeholder="e.g., 4"
                  />
                </div>
                <div className="form-group">
                  <label>Shipping Location:</label>
                  <input
                    type="text"
                    value={shipment.location}
                    onChange={(e) => setShipment({...shipment, location: e.target.value})}
                    placeholder="e.g., Processing Plant"
                  />
                </div>
                <button onClick={shipLot} className="action-button">
                  Ship Lot
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
