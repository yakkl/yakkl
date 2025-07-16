// tests/provider.test.ts
import { EIP6963Provider } from '../src/providers/EIP6963Provider';
import { ProviderRegistry } from '../src/providers/ProviderRegistry';

describe('EIP6963Provider', () => {
	let provider: EIP6963Provider;

	beforeEach(() => {
		// Setup test environment
		provider = new EIP6963Provider();
		// Mock window.postMessage
		global.window.postMessage = jest.fn();
	});

	test('should initialize with correct info', () => {
		expect(provider.info.name).toBe('Yakkl Smart Wallet');
		expect(provider.info.rdns).toBe('com.yakkl');
		expect(provider.info.uuid).toBeDefined();
	});

	test('should handle eth_requestAccounts', async () => {
		const accounts = ['0x123...'];
		// Mock message response
		mockMessageResponse({
			type: 'YAKKL_RESPONSE:EIP6963',
			id: '1',
			result: accounts
		});

		const result = await provider.request({
			method: 'eth_requestAccounts'
		});

		expect(result).toEqual(accounts);
	});

	// Add more test cases
});

// tests/registry.test.ts
describe('ProviderRegistry', () => {
	let registry: ProviderRegistry;

	beforeEach(() => {
		registry = ProviderRegistry.getInstance();
	});

	test('should announce providers on request', () => {
		const dispatchEvent = jest.spyOn(window, 'dispatchEvent');

		window.dispatchEvent(new Event('eip6963:requestProvider'));

		expect(dispatchEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'eip6963:announceProvider'
			})
		);
	});
});
