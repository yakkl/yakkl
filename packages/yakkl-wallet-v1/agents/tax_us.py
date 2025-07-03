import requests
import pandas as pd

# Replace with your own Etherscan API key
ETHERSCAN_API_KEY = "YOUR_ETHERSCAN_API_KEY"
WALLET_ADDRESS = "YOUR_ETH_WALLET_ADDRESS"

# Function to get Ethereum transactions
def get_eth_transactions(wallet_address):
    url = f"https://api.etherscan.io/api?module=account&action=txlist&address={wallet_address}&startblock=0&endblock=99999999&sort=asc&apikey={ETHERSCAN_API_KEY}"
    response = requests.get(url)
    data = response.json()

    if data["status"] == "1":
        return data["result"]
    else:
        print("Error fetching data:", data["message"])
        return []

# Process transaction data
def process_transactions(transactions):
    transaction_list = []

    for tx in transactions:
        transaction_list.append({
            "Tx Hash": tx["hash"],
            "Date": pd.to_datetime(int(tx["timeStamp"]), unit="s"),
            "From": tx["from"],
            "To": tx["to"],
            "Value (ETH)": int(tx["value"]) / 10**18,
            "Gas Fee (ETH)": int(tx["gasUsed"]) * int(tx["gasPrice"]) / 10**18,
            "Status": "Buy" if tx["to"].lower() == WALLET_ADDRESS.lower() else "Sell"
        })

    return pd.DataFrame(transaction_list)

# Generate Excel Report
def generate_excel_report(wallet_address):
    transactions = get_eth_transactions(wallet_address)
    df = process_transactions(transactions)

    file_path = f"crypto_tax_report_{wallet_address}.xlsx"

    with pd.ExcelWriter(file_path) as writer:
        df.to_excel(writer, sheet_name="Transactions", index=False)

    print(f"Tax report generated: {file_path}")
    return file_path

# Run the script
file_path = generate_excel_report(WALLET_ADDRESS)
print(f"Download your tax report at: {file_path}")
