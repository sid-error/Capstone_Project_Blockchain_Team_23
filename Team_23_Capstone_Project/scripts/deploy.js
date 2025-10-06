async function main() {
  console.log("?? Deploying ShrimpSupplyChain contract...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const ShrimpSupplyChain = await ethers.getContractFactory("ShrimpSupplyChain");
  const shrimpSupplyChain = await ShrimpSupplyChain.deploy();

  await shrimpSupplyChain.deployed();
  
  const address = shrimpSupplyChain.address;
  console.log("? ShrimpSupplyChain deployed to:", address);

  const fs = require('fs');
  const contractAddress = {
    address: address
  };
  
  if (!fs.existsSync('./frontend/src')) {
    fs.mkdirSync('./frontend/src', { recursive: true });
  }
  
  fs.writeFileSync('./frontend/src/contractAddress.json', JSON.stringify(contractAddress, null, 2));
  console.log("?? Contract address saved to frontend/src/contractAddress.json");
}

main().catch((error) => {
  console.error("? Deployment failed:", error);
  process.exit(1);
});
