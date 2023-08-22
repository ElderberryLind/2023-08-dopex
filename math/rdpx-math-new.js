// rDPX V2 LP management simulations
// DSC (Dopex Synthetic Coin) is pegged to ETH
// ETH price is $1660 //EL adjust to reasonable #
// rDPX price is $16.6 //EL adjust to reasonable #

//EL Note: original sim ratio was 0.1. Fixed to 0.01
//Starting dollar amount in LP (rdpx + ETH)
let dollarAmtInLP = 2000000; //EL Addition ...User input (will be split 50/50 between each asset)

//Starting Price rDPX
let startPriceRDPXinDollars = 16.6;//EL user input
let startPriceEthinDollars = 1660; //EL user input

let startingRatio = startPriceRDPXinDollars/startPriceEthinDollars;

let lpRdpxReserve = (dollarAmtInLP/2)/startPriceRDPXinDollars; //EL Addition
let lpDscReserve = (dollarAmtInLP/2)/startPriceEthinDollars; //EL Addition

let StartLP_rDPXinRDPX = lpRdpxReserve;
let StartLP_DSCinDSC = lpDscReserve;


let rdpxPrice = () => lpDscReserve / lpRdpxReserve; // rDPX price in ETH
let StartrdpxPriceInDollars = rdpxPrice() * startPriceEthinDollars;

let rdpxSupply = 2250000;

let rdpxV2CoreRdpxReserve = 870000; //EL adjust to reasonable # ...User input: this is the "treasury rdpx"
let rdpxV2CoreEthReserve = 0;

let dscSupply = 0;

let reLpFactor = 0.09;

let optionsHeld = 0;

let volatilityPercentage = 100 / 100;
class WritePosition {
  constructor(amount, strike) {
    this.amount = amount;
    this.strike = strike;
    this.totalPremium = 0;
  }
}

let writePositions = [];

let totalFundingCollected = 0;

let totalFundingPaid = 0;

let ethStakingApy = 4; // in percentage

// Black scholes implementation
function blackScholesPut(S, K, r, sigma, T) {
  var d1 =
    (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T));
  var d2 = d1 - sigma * Math.sqrt(T);
  var price = K * Math.exp(-r * T) * CND(-d2) - S * CND(-d1);
  return price;
}

function CND(x) {
  var L = 0.0;
  var K = 0.0;
  var dCND = 0.0;
  var pi = Math.PI;

  L = Math.abs(x);
  K = 1.0 / (1.0 + 0.2316419 * L);
  dCND =
    1.0 -
    (1.0 / Math.sqrt(2 * pi)) *
      Math.exp((-L * L) / 2) *
      (0.31938153 * K +
        -0.356563782 * K * K +
        1.781477937 * K * K * K +
        -1.821255978 * K * K * K * K +
        1.330274429 * K * K * K * K * K);

  if (x < 0) {
    return 1.0 - dCND;
  } else {
    return dCND;
  }
}

// Calculated using the following specs
// Underlying: rDPX
// Priced in (Quote Asset) ETH
// Type: PUT
// Strike: 25% OTM = 0.075 ETH
// Underlying price = 0.1 ETH (rdpx price in ETH)
// Volatility 100
// TODO: Implement time based epochs to charge funding
const fundingRate = 0.0000824; // Weekly Funding Rate in ETH

// 'amount' here is the amount of DSC to be minted
function bond(amount) {
  let rdpxReq = (0.25 * amount) / rdpxPrice();
  let writePosition = new WritePosition(amount, rdpxPrice() * 0.75);
  writePositions.push(writePosition);

  let ethReq = 0.75 * amount;

  rdpxV2CoreEthReserve += ethReq;

  const baseReLpRatio = Math.sqrt(rdpxV2CoreRdpxReserve) * reLpFactor;

  lpRdpxReserve += rdpxReq;
  lpDscReserve += 0.25 * amount; //EL..fixed this

  const discountPercentage =
    Math.sqrt(rdpxV2CoreRdpxReserve) * reLpFactor * 100;

  // Amount of DSC minted on bonding is 125% + discountPercentage
  dscSupply = amount * ((125 + discountPercentage) / 100);

  let rdpxToBeRemovedFromLp =
    ((amount * 4) / rdpxSupply) * lpRdpxReserve * baseReLpRatio;

  rdpxV2CoreRdpxReserve += rdpxToBeRemovedFromLp;
  lpRdpxReserve -= rdpxToBeRemovedFromLp;
}

function epoch() {
  for (let i = 0; i < writePositions.length; i++) {
    let funding = blackScholesPut(
      rdpxPrice(),
      writePositions[i].strike,
      0,
      volatilityPercentage,
      7 / 365
    );
    funding = funding * writePositions[i].amount;
    writePositions[i].totalPremium += funding;
    totalFundingPaid += funding;
    rdpxV2CoreEthReserve -= funding;
  }

  let fundingCollected = (rdpxV2CoreEthReserve * ethStakingApy) / 100 / 52;
  totalFundingCollected += fundingCollected;
  rdpxV2CoreEthReserve += fundingCollected;
}

for (let i = 1; i <= 25; i++) {
  bond(100);
  epoch();
}

const rdpxV2CoreValueInEth =
  (rdpxV2CoreRdpxReserve + lpRdpxReserve) * rdpxPrice() + rdpxV2CoreEthReserve;
const backingPercent = (rdpxV2CoreValueInEth / dscSupply) * 100;

//EL added
const assumedEthStartingPrice = 1660;
const assumedEthFinalPrice = 1660;
let final_rdpxPriceInDollars = rdpxPrice() * assumedEthFinalPrice;
let finalRatio = lpDscReserve / lpRdpxReserve; // rDPX price in ETH
let EndrdpxPriceInDollars = rdpxPrice() * assumedEthFinalPrice;

//


console.log({
  rdpxPrice: rdpxPrice().toLocaleString(),
  rdpxV2CoreValueInEth,
  backingPercent,
  rdpxV2CoreRdpxReserve,

  assumedEthStartingPrice,
  assumedEthFinalPrice,

  StartLP_rDPXinRDPX, 
  StartLP_DSCinDSC,
  startingRatio,
  lpDscReserve,
  lpRdpxReserve,
  finalRatio,
  StartrdpxPriceInDollars,
  EndrdpxPriceInDollars,
  dscSupply,
});
