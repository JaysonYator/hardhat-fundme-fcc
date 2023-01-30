const { getNamedAccounts, ethers, network } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");
const { assert } = require("chai");

developmentChains.includes(network.name)
  ? describe.skip
  : describe("FundMe", function () {
      let FundMe;
      let deployer;
      const sendValue = ethers.utils.parseEther("0.1");
      beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer;
        FundMe = await ethers.getContract("FundMe", deployer);
      });
      it("Allows people to withdraw", async function () {
        await FundMe.fund({ value: sendValue });
        await FundMe.withdraw();
        const endingBalance = await FundMe.provider.getBalance(FundMe.address);
        assert.equal(endingBalance.toString(), 0);
      });
    });
