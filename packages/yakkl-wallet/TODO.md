# TODOs

This is a working place for me to track all of the todos of issues I find. I did use Jira and thought about github issues but at this stage, I need to move a lot faster and not create so much overhead. Once I'm very close to release, I will begin using github or jira.

## yakkl-wallet - outstanding issues

Sent to Claude for fixing:
- PortfolioOverview:
  - Value is very large. This may be a result of the bignumber methods changed - review that code and how the values are being held (they could be held in the wrong format but this just started happening)
  - Font size for number is very large (text-4xl) - make this responsive font size on size of number with large the smallest for the very large numbers
    - I changed it to large in browser to see if looked good and it does
    - Number value is very large: $835,261,925,289,896,700,000.00
  - Review the Value: $835.27 in the Account header right above the text 'Switch Account' (home/+page.svelte). See what it is doing and compare with the PortfilioOverview
  - I reviewed yakklWalletCache and looked at the porfolio for the account and it's value is 834.7601086765821 which is more inline with what it should be
  - Remember, load from yakklWalletCache for the given account for 'Current Account' when first loading and it should show in the PortfolioOverview.svelte
  - Never call or update portfolio value from the current market price x the quantity for any of these values but run through the list of tokens (a natve token should also be in that list if the user has a native toke) and calculate the current market price * token quantity and then sum up all of the tokens for the user for the given address and that should be the portfolio value. I believe we have classes and functions that do that just make sure you use what we already have.
  - The very large number is coming from the display because it appears the values are fine in the data store
  - The tooltip popup or card on Value: shows all of the tokens but it does not total correctly and it has the same display issue.
- Different issue - the tooltip over the FAB trouble shooing button is oddly formatted and it's z-index should be at least z-45 so it shows over some of the controls. I may even need to be higher
- Similar issue but on sidepanel with Open Smart Wallet button - the tooltip shows the same type of oddly formatted tooltip and it too has a low z-index

Testing results:
- not correct so I will manually review it!!!
- 
--------

- /logout/+page.svelte - It has the same 'webextension-polyfill' related error that was originally in the layout.svelte files and some of the calls it made. Here, I think is is call lockWallet which may be the cause.
  - Review localWallet.ts and determine if it needs to use the new browserAPI calls instead of browser_ext. If so, make sure the imports don't include the older browser_ext calls
  - In localWallet - determine if we should also create a background context version of this that uses normal browser.* calls but where the background does not need to send a message to the client context to close. Instead, it could do all of the import cleanup and closing which would only leave the window.close() call for the client to deal with OR is there a way to close the wallet window properly from the background?


## yakkl-wallet - needed features or enhancements

- Star rating with a permission check box that they allow us to use their first name and last name initial or username (may need to implement messaging to others)


## yakkl-security - outstanding issues


## yakkl-mcp - outstanding issues

