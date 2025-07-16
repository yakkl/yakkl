
			const walletsDiv = document.getElementById('wallets');
			const resultsDiv = document.getElementById('results');
			let selectedProvider = null;
			const providers = [];

			function updateResults(text) {
				resultsDiv.textContent = text;
			}

			function updateWallets() {
				walletsDiv.innerHTML = '';
				providers.forEach((provider) => {
					const walletDiv = document.createElement('div');
					walletDiv.style.margin = '10px';
					walletDiv.style.padding = '10px';
					walletDiv.style.border = '1px solid #ccc';
					walletDiv.style.borderRadius = '4px';
					walletDiv.style.display = 'flex';
					walletDiv.style.alignItems = 'center';

					const img = document.createElement('img');
					img.src = provider.info.icon;
					img.width = 32;
					img.height = 32;
					img.style.marginRight = '10px';

					const infoDiv = document.createElement('div');
					infoDiv.innerHTML = `
          <div><strong>${provider.info.name}</strong></div>
          <div>ID: ${provider.info.uuid}</div>
        `;

					const selectBtn = document.createElement('button');
					selectBtn.textContent = 'Select';
					selectBtn.style.marginLeft = 'auto';
					selectBtn.onclick = () => {
						selectedProvider = provider.provider;
						updateResults(`Selected provider: ${provider.info.name}`);
					};

					walletDiv.appendChild(img);
					walletDiv.appendChild(infoDiv);
					walletDiv.appendChild(selectBtn);
					walletsDiv.appendChild(walletDiv);
				});
			}

			// Listen for wallet announcements
			window.addEventListener('eip6963:announceProvider', (event) => {
				console.log('Provider announced:', event.detail);

				// Add to providers array if not already present
				const existingIndex = providers.findIndex((p) => p.info.uuid === event.detail.info.uuid);
				if (existingIndex >= 0) {
					providers[existingIndex] = event.detail;
				} else {
					providers.push(event.detail);
				}

				updateWallets();
			});

			// Request providers button
			document.getElementById('requestProviders').addEventListener('click', () => {
				window.dispatchEvent(new Event('eip6963:requestProvider'));
			});

			// Get accounts button
			document.getElementById('getAccounts').addEventListener('click', async () => {
				if (!selectedProvider) {
					updateResults('No provider selected');
					return;
				}

				try {
					const accounts = await selectedProvider.request({ method: 'eth_accounts' });
					updateResults(JSON.stringify(accounts, null, 2));
				} catch (error) {
					updateResults(`Error: ${error.message}`);
				}
			});

			// Get chain ID button
			document.getElementById('getChainId').addEventListener('click', async () => {
				if (!selectedProvider) {
					updateResults('No provider selected');
					return;
				}

				try {
					const chainId = await selectedProvider.request({ method: 'eth_chainId' });
					updateResults(chainId);
				} catch (error) {
					updateResults(`Error: ${error.message}`);
				}
			});

			// Request accounts button
			document.getElementById('requestAccounts').addEventListener('click', async () => {
				if (!selectedProvider) {
					updateResults('No provider selected');
					return;
				}

				try {
					const accounts = await selectedProvider.request({ method: 'eth_requestAccounts' });
					updateResults(JSON.stringify(accounts, null, 2));
				} catch (error) {
					updateResults(`Error: ${error.message}`);
				}
			});

			// Request providers initially
			window.dispatchEvent(new Event('eip6963:requestProvider'));
		