import{Wallet}from"alchemy-sdk";function getWallet(prvKey){if(prvKey.length>2&&prvKey.slice(0,2)!=="0x"){prvKey="0x"+prvKey}return new Wallet(prvKey)}export{getWallet as g};
//# sourceMappingURL=ethereum.js.map
