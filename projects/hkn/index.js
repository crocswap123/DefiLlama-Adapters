const sdk = require("@defillama/sdk");
const { tombTvl } = require("../helper/tomb");
const { stakingPricedLP } = require("../helper/staking");
const { sumTokensAndLPsSharedOwners } = require("../helper/unwrapLPs");
const token0Abi = require("../helper/abis/token0.json");
const token1Abi = require("../helper/abis/token1.json");
const { default: BigNumber } = require("bignumber.js");

let token = "0xa60943a1B19395C999ce6c21527b6B278F3f2046";
let share = "0x388c07066AA6cEa2Be4db58e702333df92c3A074";
const rewardPool = "0xF8a59fF6aA18388394924cf47D69402d48A9B918";
const masonry = "0x53BD375433cE63Ba2999118f0186687eAdBF3d7B";
const pool2LPs = [
    '0x0fcffa1eD6b91B50dc80bB652f1111464A46338F',
    '0x3988E96a0a6fcE050Dd095f7333EBa8650F25372',
]

async function pool2(timestamp, block, chainBlocks) {
    block = chainBlocks.cronos;
    const chain = 'cronos';
    let balances = {};
    token = token.toLowerCase();
    share = share.toLowerCase();
    block = chainBlocks[chain];
    const pool2Balances = (await sdk.api.abi.multiCall({
        calls: pool2LPs.map(p => ({
            target: p,
            params: rewardPool
        })),
        abi: "erc20:balanceOf",
        block,
        chain
    })).output;
    const supplies = (await sdk.api.abi.multiCall({
        calls: pool2LPs.map(p => ({
            target: p
        })),
        abi: "erc20:totalSupply",
        block,
        chain
    })).output;
    const pool2Token0 = (await sdk.api.abi.multiCall({
        calls: pool2LPs.map(p => ({
            target: p
        })),
        abi: token0Abi,
        block,
        chain
    })).output;
    const pool2Token1 = (await sdk.api.abi.multiCall({
        calls: pool2LPs.map(p => ({
            target: p
        })),
        abi: token1Abi,
        block,
        chain
    })).output;

    // console.log('dome', pool2Token0, pool2Token1)

    for (let i = 0; i < pool2LPs.length; i++) {
        let listedToken;
        const token0 = pool2Token0[i].output.toLowerCase();
        const token1 = pool2Token1[i].output.toLowerCase();
        if (token0 === token || token0 === share) {
            listedToken = token1;
        }
        else if (token1 === token || token1 === share) {
            listedToken = token0;
        }
        const listedTokenBalance = (await sdk.api.erc20.balanceOf({
            target: listedToken,
            owner: pool2LPs[i],
            block,
            chain
        })).output;
        // console.log(pool2LPs[i], listedTokenBalance.toString())
        const balance = BigNumber(pool2Balances[i].output).times(listedTokenBalance).div(supplies[i].output).times(2).toFixed(0);
        sdk.util.sumSingleBalance(balances, `cronos:${listedToken}`, balance);
    }
    return balances
}
async function tvl(timestamp, block, chainBlocks) {
    const balances = {};
    await sumTokensAndLPsSharedOwners(
        balances,
        [
            ["0xbA452A1c0875D33a440259B1ea4DcA8f5d86D9Ae", true],
            ['0x0fcffa1eD6b91B50dc80bB652f1111464A46338F', true],
            ['0x3988E96a0a6fcE050Dd095f7333EBa8650F25372', true],
            ['0x5801d37e04ab1f266c35a277e06c9d3afa1c9ca2', true],
            ["0x97749c9B61F878a880DfE312d2594AE07AEd7656", false],
            ["0x50c0C5bda591bc7e89A342A3eD672FB59b3C46a7", false],
            ["0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23", false],
            ["0x2D03bECE6747ADC00E1a131BBA1469C15fD11e03", false],
            ['0x654bAc3eC77d6dB497892478f854cF6e8245DcA9', false],
            ['0xc21223249CA28397B4B6541dfFaEcC539BfF0c59', false],
            ['0x66e428c3f67a68878562e79A0234c1F83c208770', false],
        ],
        ["0x3827CAa33557304e1CA5D89c2f85919Da171C44D"],
        chainBlocks.cronos,
        "cronos",
        (addr) => `cronos:${addr}`
    );
    delete balances['cronos:0xa60943a1B19395C999ce6c21527b6B278F3f2046'];

    return balances;
};
module.exports = {
    cronos: {
        tvl,
        pool2,
        staking: stakingPricedLP(masonry, share, 'cronos', pool2LPs[1], 'mmfinance', true),
    }
};