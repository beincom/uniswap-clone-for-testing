import { expect, use } from "chai";
import { ethers, network } from "hardhat";

import {
  TestWeth9,
  UniswapV3Factory,
  NonfungiblePositionManager,
  TestERC20,
  UniswapV3Pool,
} from "../../typechain-types";

import {
  encodeSqrtRatioX96,
  FeeAmount,
  TICK_SPACINGS,
  Pool,
  Position,
  RemoveLiquidityOptions,
  CollectOptions,
} from "@uniswap/v3-sdk";
import { CurrencyAmount, Token } from "@uniswap/sdk-core";

export const getMinTick = (tickSpacing: number) =>
  Math.ceil(-887272 / tickSpacing) * tickSpacing;
export const getMaxTick = (tickSpacing: number) =>
  Math.floor(887272 / tickSpacing) * tickSpacing;

function compareToken(a: { target: string }, b: { target: string }): -1 | 1 {
  return a.target.toLowerCase() < b.target.toLowerCase() ? -1 : 1;
}

function sortedTokens(
  a: { target: string },
  b: { target: string }
): [typeof a, typeof b] | [typeof b, typeof a] {
  return compareToken(a, b) < 0 ? [a, b] : [b, a];
}

describe("Uniswap Mainnet", function () {
  let uniswapV3Factory: UniswapV3Factory;
  let nonfungiblePositionManager: NonfungiblePositionManager;
  let pool: UniswapV3Pool;

  let bicToken: TestERC20;
  let weth9: TestWeth9;

  let MAX_BPS = 100_00n;

  const priceEth = 50000000;
  const priceBic = 1000;
  const feeTiter = FeeAmount.MEDIUM;
  const spacing = TICK_SPACINGS[feeTiter];
  const minTick = getMinTick(spacing);
  const maxTick = getMaxTick(spacing);
  const INIT_BIC_AMOUNT = ethers.parseEther("100000");
  const INIT_ETH_AMOUNT = ethers.parseEther("50");


  const constructPool = async () => {
    const [token0, token1] = sortedTokens(
      bicToken as { target: string },
      weth9 as { target: string }
    );
    const [liquidity, slot0] = await Promise.all([
      pool.liquidity(),
      pool.slot0(),
    ]);

    const configuredPool = new Pool(
      new Token(network.config.chainId || 0, token0.target, 18, "BIC", "BIC"),
      new Token(network.config.chainId || 0, token1.target, 18, "WETH", "WETH"),
      feeTiter,
      slot0.sqrtPriceX96.toString(),
      liquidity.toString(),
      Number(slot0.tick)
    );
    return configuredPool;
  };

  const constructPosition = async (amount0: string, amount1: string) => { 
    const configuredPool = await constructPool();
    const position = Position.fromAmounts({
      pool: configuredPool,
      tickLower: minTick,
      tickUpper: maxTick,
      amount0: amount0,
      amount1: amount1,
      useFullPrecision: true,
    });
    return position;
  }
  
  const prepare = async () => {
    const AMOUNT_WETH = ethers.parseEther("1000");
    const AMOUNT_BIC = ethers.parseEther("100000");
    const [deployer, user1] = await ethers.getSigners();

    const wrapEthTx = await weth9.deposit({ value: AMOUNT_WETH });
    await wrapEthTx.wait();

    const approveWETHTx = await weth9.approve(
      nonfungiblePositionManager.target,
      ethers.MaxUint256
    );
    await approveWETHTx.wait();

    const bicTokenTx = await bicToken.mint(
      deployer.address,
      ethers.parseEther("100000")
    );
    await bicTokenTx.wait();

    const approveBICTokenTx = await bicToken.approve(
      nonfungiblePositionManager.target,
      ethers.MaxUint256
    );
    await approveBICTokenTx.wait();

    const mintBICTokenUser1Tx = await bicToken
      .connect(user1)
      .mint(user1.address, AMOUNT_BIC);
    await mintBICTokenUser1Tx.wait();

    const approveBICTokenUser1Tx = await bicToken
      .connect(user1)
      .approve(nonfungiblePositionManager.target, ethers.MaxUint256);
    await approveBICTokenUser1Tx.wait();

    const wrapEthUser1Tx = await weth9
      .connect(user1)
      .deposit({ value: AMOUNT_WETH });
    await wrapEthUser1Tx.wait();

    const approveWETHUserTx = await weth9
      .connect(user1)
      .approve(nonfungiblePositionManager.target, ethers.MaxUint256);
    await approveWETHUserTx.wait();
  };
  before(async () => {
    const [deployer] = await ethers.getSigners();
    const BicToken = await ethers.getContractFactory("TestERC20");
    bicToken = await BicToken.deploy();

    const WrapEth = await ethers.getContractFactory("TestWeth9");
    weth9 = await WrapEth.deploy();
    await weth9.waitForDeployment();

    uniswapV3Factory = await ethers.getContractAt(
      "UniswapV3Factory",
      "0x1F98431c8aD98523631AE4a59f267346ea31F984"
    );
    nonfungiblePositionManager = await ethers.getContractAt(
      "NonfungiblePositionManager",
      "0xC36442b4a4522E871399CD717aBDD847Ab11FE88"
    );

    expect(
      await uniswapV3Factory.feeAmountTickSpacing(FeeAmount.MEDIUM)
    ).to.be.eq(TICK_SPACINGS[FeeAmount.MEDIUM]);

    await prepare();

    console.table({
      bicToken: bicToken.target,
      weth9: weth9.target,
      uniswapV3Factory: uniswapV3Factory.target,
      nonfungiblePositionManager: nonfungiblePositionManager.target,
    });

    const [token0, token1] = sortedTokens(
      bicToken as { target: string },
      weth9 as { target: string }
    );

    const price0 = token0.target === bicToken.target ? priceBic : priceEth;
    const price1 = token1.target === weth9.target ? priceEth : priceBic;
    const sqrtPriceX96 = encodeSqrtRatioX96(price0, price1);
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

    const isBicToken0 = token0.target === bicToken.target;
    const amount0Desired = isBicToken0 ? INIT_ETH_AMOUNT : INIT_BIC_AMOUNT;
    const amount1Desired = isBicToken0 ? INIT_BIC_AMOUNT : INIT_ETH_AMOUNT;

    const createPoolTx = await nonfungiblePositionManager
      .connect(deployer)
      .multicall([
        nonfungiblePositionManager.interface.encodeFunctionData(
          "createAndInitializePoolIfNecessary",
          [
            token0.target.toString(),
            token1.target.toString(),
            feeTiter,
            sqrtPriceX96.toString(),
          ]
        ),
        nonfungiblePositionManager.interface.encodeFunctionData("mint", [
          {
            token0: token0.target.toString(),
            token1: token1.target.toString(),
            fee: feeTiter,
            tickLower: minTick,
            tickUpper: maxTick,
            amount0Desired: amount0Desired,
            amount1Desired: amount1Desired,
            amount0Min: 0,
            amount1Min: 0,
            recipient: deployer.address,
            deadline: deadline,
          },
        ]),
        nonfungiblePositionManager.interface.encodeFunctionData("refundETH"),
      ]);
    await createPoolTx.wait();

    const getPool = await uniswapV3Factory.getPool(
      token0.target,
      token1.target,
      feeTiter
    );
    pool = await ethers.getContractAt("UniswapV3Pool", getPool);
    const slot0 = await pool.slot0();

    expect(slot0.sqrtPriceX96.toString()).to.be.eq(sqrtPriceX96.toString());

    // TODO: Prepare blacklist, tax, and other settings of BicToken
  });

  it("Should transfer without charging tax fee", async () => {
    const amount = ethers.parseEther("1000");
    const [deployer, user1] = await ethers.getSigners();
    const balancePrev = await bicToken.balanceOf(user1.address);

    const transferTx = await bicToken
      .connect(deployer)
      .transfer(user1.address, amount);
    await transferTx.wait();

    const balanceNext = await bicToken.balanceOf(user1.address);

    expect(balanceNext).to.be.eq(balancePrev + amount);
  });

  it("Should transfer with charging tax fee", async () => {
    const amount = ethers.parseEther("1000");

    // TODO: Get tax fee from the Token
    const taxFee = 1000n;
    const fee = (amount * taxFee) / MAX_BPS;
    const amountRemaining = amount - fee;
    const [deployer, user1] = await ethers.getSigners();
    const balancePrev = await bicToken.balanceOf(user1.address);

    const transferTx = await bicToken
      .connect(deployer)
      .transfer(user1.address, amount);
    await transferTx.wait();

    const balanceNext = await bicToken.balanceOf(user1.address);

    expect(balanceNext).to.be.eq(balancePrev + amountRemaining);
  });

  it("Should be SELL with tax", async () => {
    const [deployer, user1] = await ethers.getSigners();
    const approveTx = await bicToken
      .connect(user1)
      .approve(nonfungiblePositionManager.target, ethers.MaxUint256);

    const swapTx = await nonfungiblePositionManager
      .connect(user1)
      .multicall([]);
  });

  it("Should be ADD LIQUIDITY without charging tax fee", async () => {
    const [deployer, user1] = await ethers.getSigners();

    const [token0, token1] = sortedTokens(
      bicToken as { target: string },
      weth9 as { target: string }
    );
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
    const isBicToken0 = token0.target === bicToken.target;
    const amount0Desired = isBicToken0
      ? ethers.parseEther("1")
      : ethers.parseEther("10000");
    const amount1Desired = isBicToken0
      ? ethers.parseEther("10000")
      : ethers.parseEther("1");

    const position = await constructPosition(amount0Desired.toString(), amount1Desired.toString());
    const mintAmount0Expect = position.mintAmounts.amount0;
    const mintAmount1Expect = position.mintAmounts.amount1;

    const addLiquidityTx = await nonfungiblePositionManager
      .connect(user1)
      .multicall([
        nonfungiblePositionManager.interface.encodeFunctionData("mint", [
          {
            token0: token0.target.toString(),
            token1: token1.target.toString(),
            fee: feeTiter,
            tickLower: getMinTick(spacing),
            tickUpper: getMaxTick(spacing),
            amount0Desired: amount0Desired,
            amount1Desired: amount1Desired,
            amount0Min: 0,
            amount1Min: 0,
            recipient: deployer.address,
            deadline: deadline,
          },
        ]),
      ]);

    const receipt = await addLiquidityTx.wait();
    const parseLog = receipt?.logs
      .map((log) => {
        try {
          return pool.interface.parseLog(log);
        } catch (error) {
          return null;
        }
      })
      .filter((log) => log !== null);
    const mintEvent = parseLog?.find((log) => log?.name === "Mint");
    mintEvent?.args;
    // emit Mint(msg.sender, recipient, tickLower, tickUpper, amount, amount0, amount1);
    const amount0 = mintEvent?.args?.amount0;
    const amount1 = mintEvent?.args?.amount1;
    // Except the liquidity
    expect(amount0.toString()).to.be.eq(mintAmount0Expect.toString());
    expect(amount1.toString()).to.be.eq(mintAmount1Expect.toString());
  });


  it("Should be REMOVE LIQUIDITY without charging tax fee", async () => {
    const [deployer, user1] = await ethers.getSigners();
    
    const collectOptions: Omit<CollectOptions, 'tokenId'> = {
      expectedCurrencyOwed0: CurrencyAmount.fromRawAmount(
        token0,
        0
      ),
      expectedCurrencyOwed1: CurrencyAmount.fromRawAmount(
        token1,
        0
      ),
      recipient: user1.address,
    }
    
    const removeLiquidityOptions: RemoveLiquidityOptions = {
      deadline: Math.floor(Date.now() / 1000) + 60 * 20,
      slippageTolerance: new Percent(50, 10_000),
      tokenId: positionId,
      // percentage of liquidity to remove
      liquidityPercentage: new Percent(0.5),
      collectOptions,
    }
  });

  it("Should be COLLECT FEE LIQUIDITY without charging tax fee", async () => {
    const [deployer, user1] = await ethers.getSigners();



  });
});
