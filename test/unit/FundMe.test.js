const { assert, expect } = require("chai");
const { deployments, ethers, getNamedAccounts } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("FundMe", async function () {
      let FundMe;
      let deployer;
      let mockV3Aggregator;
      const sendValue = ethers.utils.parseEther("0.1"); //1 eth
      beforeEach(async function () {
        //deploy FundMe contract
        //using hardhat deploy
        //consts {deployer} = await ethers.getSigners()
        //const accountZero = accounts[0]
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]);
        FundMe = await ethers.getContract("FundMe", deployer);
        mockV3Aggregator = await ethers.getContract(
          "MockV3Aggregator",
          deployer
        );
      });

      describe("constructor", async function () {
        it("sets aggregator addresses correctly", async function () {
          const response = await FundMe.getPriceFeed();
          assert.equal(response, mockV3Aggregator.address);
        });
      });
      describe("FundMe", async function () {
        it("Fails if you don't send enough ETH", async function () {
          await expect(FundMe.fund()).to.be.revertedWith(
            "You need to spend more ETH!"
          );
        });
        it("updated the amount funded data structure", async function () {
          await FundMe.fund({ value: sendValue });
          const response = await FundMe.getAddressToAmountFunded(deployer);
          assert.equal(response.toString(), sendValue.toString());
        });
        it("Adds funder to array of getFunder", async function () {
          await FundMe.fund({ value: sendValue });
          const funder = await FundMe.getFunder(0);
          assert.equal(funder, deployer);
        });
      });
      describe("withdraw", async function () {
        beforeEach(async function () {
          await FundMe.fund({ value: sendValue });
        });
        it("withdraw ETH from a single founder", async function () {
          //Arrange
          const startingFundMeBalance = await FundMe.provider.getBalance(
            FundMe.address
          );
          const startingDeployerBalance = await FundMe.provider.getBalance(
            deployer
          );
          //act
          const transactionResponse = await FundMe.withdraw();
          const transactionReceipt = await transactionResponse.wait(1);
          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);

          const endingFundMeBalance = await FundMe.provider.getBalance(
            FundMe.address
          );
          const endingDeployerBalance = await FundMe.provider.getBalance(
            deployer
          );
          //gasCost
          //assert
          assert.equal(endingFundMeBalance, 0);
          assert.equal(
            startingFundMeBalance.add(startingDeployerBalance).toString(),
            endingDeployerBalance.add(gasCost).toString()
          );
        });
        it("allows us to withdraw with multiple getFunder", async function () {
          //arrange
          const accounts = await ethers.getSigners();
          for (let i = 1; i < 6; i++) {
            const FundMeConnectedContract = await FundMe.connect(accounts[i]);
            await FundMeConnectedContract.fund({ value: sendValue });
          }
          const startingFundMeBalance = await FundMe.provider.getBalance(
            FundMe.address
          );
          const startingDeployerBalance = await FundMe.provider.getBalance(
            deployer
          );

          //act
          const transactionResponse = await FundMe.withdraw();
          const transactionReceipt = await transactionResponse.wait(1);
          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);
          const endingFundMeBalance = await FundMe.provider.getBalance(
            FundMe.address
          );
          const endingDeployerBalance = await FundMe.provider.getBalance(
            deployer
          );

          //assert
          assert.equal(endingFundMeBalance, 0);
          assert.equal(
            startingFundMeBalance.add(startingDeployerBalance).toString(),
            endingDeployerBalance.add(gasCost).toString()
          );
          //make sure getFunder are reset properly
          await expect(FundMe.getFunder(0)).to.be.reverted;

          for (i = 1; i < 6; i++) {
            assert.equal(
              await FundMe.getAddressToAmountFunded(accounts[i].address),
              0
            );
          }
        });
        it("Only allows the owner to withdraw", async function () {
          const accounts = await ethers.getSigners();
          const attacker = accounts[1];
          const attackerConnectedContract = await FundMe.connect(attacker);
          await expect(
            attackerConnectedContract.withdraw()
          ).to.be.revertedWithCustomError(
            attackerConnectedContract,
            "fundMe__NotOwner"
          );
        });
        it("cheaperWithdraw testing...", async function () {
          //arrange
          const accounts = await ethers.getSigners();
          for (let i = 1; i < 6; i++) {
            const FundMeConnectedContract = await FundMe.connect(accounts[i]);
            await FundMeConnectedContract.fund({ value: sendValue });
          }
          const startingFundMeBalance = await FundMe.provider.getBalance(
            FundMe.address
          );
          const startingDeployerBalance = await FundMe.provider.getBalance(
            deployer
          );

          //act
          const transactionResponse = await FundMe.cheaperWithdraw();
          const transactionReceipt = await transactionResponse.wait(1);
          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);
          const endingFundMeBalance = await FundMe.provider.getBalance(
            FundMe.address
          );
          const endingDeployerBalance = await FundMe.provider.getBalance(
            deployer
          );

          //assert
          assert.equal(endingFundMeBalance, 0);
          assert.equal(
            startingFundMeBalance.add(startingDeployerBalance).toString(),
            endingDeployerBalance.add(gasCost).toString()
          );
          //make sure getFunder are reset properly
          await expect(FundMe.getFunder(0)).to.be.reverted;

          for (i = 1; i < 6; i++) {
            assert.equal(
              await FundMe.getAddressToAmountFunded(accounts[i].address),
              0
            );
          }
        });
      });
    });
