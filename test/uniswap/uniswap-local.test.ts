// import { expect } from "chai";
// import { ethers, network } from "hardhat";

// import {
//   TestWeth9,
//   UniswapV3Factory,
//   NonfungiblePositionManager,
//   TestERC20,
//   UniswapV3Pool
// } from "../../typechain-types";

// import {
//   encodeSqrtRatioX96,
//   FeeAmount,
//   TICK_SPACINGS,
//   computePoolAddress
// } from "@uniswap/v3-sdk";
// import { Token } from "@uniswap/sdk-core";

// export const getMinTick = (tickSpacing: number) => Math.ceil(-887272 / tickSpacing) * tickSpacing;
// export const getMaxTick = (tickSpacing: number) => Math.floor(887272 / tickSpacing) * tickSpacing;

// function compareToken(a: { target: string }, b: { target: string }): -1 | 1 {
//   return a.target.toLowerCase() < b.target.toLowerCase() ? -1 : 1
// }

// function sortedTokens(
//   a: { target: string },
//   b: { target: string }
// ): [typeof a, typeof b] | [typeof b, typeof a] {
//   return compareToken(a, b) < 0 ? [a, b] : [b, a]
// }

// describe("Uniswap Local", function () {
//   let uniswapV3Factory: UniswapV3Factory;
//   let nonfungiblePositionManager: NonfungiblePositionManager;
//   let pool: UniswapV3Pool;
//   let bicToken: TestERC20;
//   let usdtToken: TestERC20;
//   let weth9: TestWeth9;
//   let MAX_BPS = 100_00n;

//   const nativeLabel =
//     "0x4554480000000000000000000000000000000000000000000000000000000000"; // "ETH"

//   before(async () => {
//     const [deployer] = await ethers.getSigners();
//     const BicToken = await ethers.getContractFactory("TestERC20");
//     bicToken = await BicToken.deploy();

//     const TestERC20 = await ethers.getContractFactory("TestERC20");
//     usdtToken = await TestERC20.deploy();
//     await usdtToken.waitForDeployment();

//     const WrapEth = await ethers.getContractFactory("TestWeth9");
//     weth9 = await WrapEth.deploy();
//     await weth9.waitForDeployment();

//     const UniswapV3Factory = await ethers.getContractFactory(
//       "UniswapV3Factory"
//     );
//     uniswapV3Factory = await UniswapV3Factory.deploy();
//     await uniswapV3Factory.waitForDeployment();

//     const nftDescriptor = await ethers.getContractFactory("NFTDescriptor");
//     const nftDescriptorInstance = await nftDescriptor.deploy();
//     await nftDescriptorInstance.waitForDeployment();
    
//     const NonfungibleTokenPositionDescriptor = await ethers.getContractFactory(
//       "NonfungibleTokenPositionDescriptor",
//       {
//         libraries: {
//           NFTDescriptor: nftDescriptorInstance.target,
//         },
//       }
//     );

//     const tokenPositionDescriptor =
//       await NonfungibleTokenPositionDescriptor.deploy(
//         weth9.target,
//         nativeLabel
//       );
//       await tokenPositionDescriptor.waitForDeployment();

//     const NonfungiblePositionManagerFactory = await ethers.getContractFactory(
//       "NonfungiblePositionManager"
//     );

//     nonfungiblePositionManager = await NonfungiblePositionManagerFactory.deploy(
//       uniswapV3Factory.target,
//       weth9.target,
//       tokenPositionDescriptor.target
//     );
//     await nonfungiblePositionManager.waitForDeployment();

//     expect(
//       await uniswapV3Factory.feeAmountTickSpacing(FeeAmount.MEDIUM)
//     ).to.be.eq(TICK_SPACINGS[FeeAmount.MEDIUM]);
//     expect(await tokenPositionDescriptor.nativeCurrencyLabel()).to.be.eq("ETH");


//     const wrapEthTx = await weth9.deposit({ value: ethers.parseEther("100") });
//     await wrapEthTx.wait();

//     const approveWETHTx = await weth9.approve(nonfungiblePositionManager.target, ethers.MaxUint256);
//     await approveWETHTx.wait();

//     const bicTokenTx = await bicToken.mint(deployer.address, ethers.parseEther("100000"));
//     await bicTokenTx.wait();

//     const approveBICTokenTx = await bicToken.approve(nonfungiblePositionManager.target, ethers.MaxUint256);
//     await approveBICTokenTx.wait();

//     console.table({
//       bicToken: bicToken.target,
//       usdtToken: usdtToken.target,
//       weth9: weth9.target,
//       uniswapV3Factory: uniswapV3Factory.target,
//       nonfungiblePositionManager: nonfungiblePositionManager.target,
//     });


//     const feeTiter = FeeAmount.MEDIUM;
//     const spacing = TICK_SPACINGS[feeTiter];
//     const priceEth = 47853538;
//     const priceBic = 1000;
//     const [token0, token1] = sortedTokens(bicToken as { target: string }, weth9 as { target: string });
//     let price0 = token0.target === bicToken.target ? priceBic : priceEth;
//     let price1 = token1.target === weth9.target ? priceEth : priceBic;
//     const sqrtPriceX96 = encodeSqrtRatioX96(price0, price1);
//     const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

//     const amount0Desired = ethers.parseEther("100");
//     const amount1Desired = ethers.parseEther("100");

//     const computePool =  computePoolAddress({
//       factoryAddress: uniswapV3Factory.target.toString(),
//       tokenA: new Token(network.config.chainId || 0, token0.target.toString(), 18, "BIC", "BIC"),
//       tokenB: new Token(network.config.chainId || 0, token1.target.toString(), 18, "WETH", "WETH"),
//       fee: feeTiter,
//       chainId: network.config.chainId || 0,
//     });
//     console.log("Computed Pool Address:", computePool);

//     const createPoolTx = await nonfungiblePositionManager.connect(deployer).multicall([
//       nonfungiblePositionManager.interface.encodeFunctionData('createAndInitializePoolIfNecessary', [
//         token0.target.toString(), token1.target.toString(), feeTiter, sqrtPriceX96.toString(),
//       ]),
//       // nonfungiblePositionManager.interface.encodeFunctionData('mint', [{
//       //   token0: token0.target.toString(),
//       //   token1: token1.target.toString(),
//       //   fee: feeTiter,
//       //   tickLower: getMinTick(spacing),
//       //   tickUpper: getMaxTick(spacing),
//       //   amount0Desired: amount0Desired,
//       //   amount1Desired: amount1Desired,
//       //   amount0Min: 0,
//       //   amount1Min: 0,
//       //   recipient: deployer.address,
//       //   deadline: deadline
//       // }]),
//       nonfungiblePositionManager.interface.encodeFunctionData('refundETH'),
//     ]);
//     const receipt = await createPoolTx.wait();

//     const getPool = await uniswapV3Factory.getPool(token0.target, token1.target, feeTiter);
//     pool = await ethers.getContractAt("UniswapV3Pool", getPool);
//     const slot0 = await pool.slot0();

//     expect(slot0.sqrtPriceX96.toString()).to.be.eq(sqrtPriceX96.toString())

//     const testTx = await nonfungiblePositionManager.connect(deployer).multicall([

//       nonfungiblePositionManager.interface.encodeFunctionData('mint', [{
//         token0: token0.target.toString(),
//         token1: token1.target.toString(),
//         fee: feeTiter,
//         tickLower: getMinTick(spacing),
//         tickUpper: getMaxTick(spacing),
//         amount0Desired: amount0Desired,
//         amount1Desired: amount1Desired,
//         amount0Min: 0,
//         amount1Min: 0,
//         recipient: deployer.address,
//         deadline: deadline
//       }]),
//       nonfungiblePositionManager.interface.encodeFunctionData('refundETH'),
//     ]);
//   });

//   it("Should transfer without charging tax fee", async () => {
//     const amount = ethers.parseEther("1000");
//     const [deployer, user1] = await ethers.getSigners();
//     const balancePrev = await bicToken.balanceOf(user1.address);
    
//     const transferTx = await bicToken.connect(deployer).transfer(user1.address, amount);
//     await transferTx.wait();

//     const balanceNext = await bicToken.balanceOf(user1.address);

//     expect(balanceNext).to.be.eq(balancePrev + amount);
//   });
  
//   it("Should transfer with charging tax fee", async () => {
//     const amount = ethers.parseEther("1000");
    
//     // TODO: Get tax fee from the Token
//     const taxFee = 1000n;
//     const fee = amount * taxFee / MAX_BPS;
//     const amountRemaining = amount - fee;
//     const [deployer, user1] = await ethers.getSigners();
//     const balancePrev = await bicToken.balanceOf(user1.address);
    
//     const transferTx = await bicToken.connect(deployer).transfer(user1.address, amount);
//     await transferTx.wait();

//     const balanceNext = await bicToken.balanceOf(user1.address);

//     expect(balanceNext).to.be.eq(balancePrev + amountRemaining);
//   });

//   it("Should be SELL with tax", async () => {
//     const [deployer, user1] = await ethers.getSigners();
//     const approveTx = await bicToken.connect(user1).approve(nonfungiblePositionManager.target, ethers.MaxUint256);

//     const swapTx = await nonfungiblePositionManager.connect(user1).multicall([

//     ]);
//   });

//   it("Should be ADD LIQUIDITY without charging tax fee", async () => {

//   });
// });
