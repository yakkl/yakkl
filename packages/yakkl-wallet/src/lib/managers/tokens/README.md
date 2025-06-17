## Add default tokens

Default tokens are tokens we have verified or know. These are set as defaults for the user. The user can not delete these.

Custom tokens are tokens we may or may not have verified but the user wishes to track them. If the user wish to track something is not EVM compatible such as DOGE (part of the DC blockchain), they can still add them but we update an internal flag to price only. Price only means we can track the prices but the user can't do any native transfers of DOGE. We also do not access balances of a non-evm address.

> All tokens are currently EVM compatible only

>A common check for us is: https://chainlist.org/rpcs.json

The above list returns specifics on a number of blockchains and tokens. If the token is not part of the EVM category then the above applies.

The flag is 'evmCompatible' which defaults to true. At the moment, we allow the user to check if EVM Compatible. We know the user may not know what it means and it may cause multiple checks to occur or an error if the user tries to transfer to or from a non-evm compatible token. This is temporary.

When trading we may add it to the default tokens
	// {
	// 	"name": "World Liberty Financial (not trading yet)",
	// 	"address": "0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6",
	// 	"symbol": "WLFI",
	// 	"decimals": 18,
	// 	"chainId": 1,
	// 	"sidepanel": true,
	// 	"evmCompatible": true,
	// 	"isNative": false,
	// 	"isStablecoin": true,
	// 	"logoURI": "https://etherscan.io/token/images/worldlibertyfinancial_32.png"
	// },
