const { expect } = require("chai");

describe("ShrimpSupplyChain", function () {
  let shrimpSupplyChain;
  let owner, fishingBoat, processor, consumer;

  beforeEach(async function () {
    [owner, fishingBoat, processor, consumer] = await ethers.getSigners();
    
    const ShrimpSupplyChain = await ethers.getContractFactory("ShrimpSupplyChain");
    shrimpSupplyChain = await ShrimpSupplyChain.deploy();
  });

  it("Should deploy successfully", async function () {
    // Just check that the contract has functions we expect
    expect(await shrimpSupplyChain.lots("TEST")).to.exist;
  });

  it("Should register entity", async function () {
    await shrimpSupplyChain.connect(fishingBoat).registerEntity("Ocean Fisher", 0, "Pacific Ocean");
    const entity = await shrimpSupplyChain.entities(fishingBoat.address);
    expect(entity.name).to.equal("Ocean Fisher");
  });

  it("Should create raw material lot", async function () {
    await shrimpSupplyChain.connect(fishingBoat).registerEntity("Ocean Fisher", 0, "Pacific Ocean");
    
    await shrimpSupplyChain.connect(fishingBoat).createRawMaterialLot(
      "RAW_SHRIMP",
      "SH001",
      1000,
      "Pacific Ocean"
    );

    const lot = await shrimpSupplyChain.lots("SH001");
    expect(lot.productId).to.equal("RAW_SHRIMP");
    expect(lot.quantity).to.equal(1000);
  });

  it("Should allow consumer to view basic provenance", async function () {
    await shrimpSupplyChain.connect(fishingBoat).registerEntity("Ocean Fisher", 0, "Pacific Ocean");
    await shrimpSupplyChain.connect(fishingBoat).createRawMaterialLot(
      "RAW_SHRIMP",
      "SH001",
      1000,
      "Pacific Ocean"
    );

    const provenance = await shrimpSupplyChain.connect(consumer).getConsumerProvenance("SH001");
    expect(provenance.productId).to.equal("RAW_SHRIMP");
  });
});
