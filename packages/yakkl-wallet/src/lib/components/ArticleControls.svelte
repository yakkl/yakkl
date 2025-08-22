<!-- ArticleControls.svelte -->
<script lang="ts">
	import PrinterIcon from './icons/PrinterIcon.svelte';
	import TrashIcon from './icons/TrashIcon.svelte';
	import Confirmation from './Confirmation.svelte';
	import type { RSSItem } from '$lib/managers/ExtensionRSSFeedService';
	import { yakklBookmarkedArticlesStore, setYakklBookmarkedArticles } from '$lib/common/stores';
	import { derived } from 'svelte/store';
	import { enhancedBookmarkStore } from '$lib/stores/enhancedBookmark.store';

	let {
		article,
		bookmarkEnabled = true,
		printEnabled = true,
		deleteEnabled = false,
		onDelete
	} = $props<{
		article: RSSItem;
		bookmarkEnabled?: boolean;
		printEnabled?: boolean;
		deleteEnabled?: boolean;
		onDelete?: (article: RSSItem) => Promise<void>;
	}>();

	let showDeleteConfirmation = $state(false);

	// Create a derived store for bookmark state
	const isBookmarked = derived(yakklBookmarkedArticlesStore, ($store) =>
		$store.some((a) => a.title === article.title && a.source === article.source)
	);

	// Function to sanitize content
	function sanitizeContent(content: string): string {
		const parser = new DOMParser();
		const doc = parser.parseFromString(content, 'text/html');

		// Remove potentially problematic elements
		const elementsToRemove = [
			'script',
			'iframe',
			'style',
			'link',
			'meta',
			'object',
			'embed',
			'applet',
			'noscript',
			'form',
			'input',
			'button',
			'select',
			'textarea',
			'[onclick]',
			'[onload]',
			'[onerror]',
			'[src*="platform.twitter.com"]',
			'[src*="facebook.com"]',
			'[src*="instagram.com"]',
			'[src*="youtube.com"]',
			'[src*="vimeo.com"]',
			'[src*="player"]',
			'[src*="widget"]',
			'[src*="embed"]',
			'[src*="script"]',
			'[src*="tracker"]',
			'[src*="analytics"]',
			'[src*="pixel"]',
			'[src*="beacon"]',
			'[src*="cookie"]',
			'[src*="ad"]',
			'[src*="banner"]',
			'[src*="promo"]',
			'[src*="sponsor"]',
			'[src*="affiliate"]',
			'[src*="tracking"]',
			'[src*="pixel"]',
			'[src*="beacon"]',
			'[src*="cookie"]',
			'[src*="analytics"]',
			'[src*="tracker"]',
			'[src*="monitor"]',
			'[src*="stat"]',
			'[src*="count"]',
			'[src*="counter"]',
			'[src*="measure"]',
			'[src*="metric"]',
			'[src*="track"]',
			'[src*="trace"]',
			'[src*="log"]',
			'[src*="debug"]',
			'[src*="test"]',
			'[src*="dev"]',
			'[src*="staging"]',
			'[src*="qa"]',
			'[src*="beta"]',
			'[src*="alpha"]',
			'[src*="demo"]',
			'[src*="example"]',
			'[src*="sample"]',
			'[src*="mock"]',
			'[src*="fake"]',
			'[src*="dummy"]',
			'[src*="placeholder"]',
			'[src*="temp"]',
			'[src*="temporary"]',
			'[src*="test"]',
			'[src*="dev"]',
			'[src*="development"]',
			'[src*="staging"]',
			'[src*="qa"]',
			'[src*="beta"]',
			'[src*="alpha"]',
			'[src*="demo"]',
			'[src*="example"]',
			'[src*="sample"]',
			'[src*="mock"]',
			'[src*="fake"]',
			'[src*="dummy"]',
			'[src*="placeholder"]',
			'[src*="temp"]',
			'[src*="temporary"]'
		];

		elementsToRemove.forEach((selector) => {
			doc.querySelectorAll(selector).forEach((el) => el.remove());
		});

		// Remove inline styles and event handlers
		doc.querySelectorAll('*').forEach((el) => {
			el.removeAttribute('style');
			el.removeAttribute('onclick');
			el.removeAttribute('onload');
			el.removeAttribute('onerror');
			el.removeAttribute('onmouseover');
			el.removeAttribute('onmouseout');
			el.removeAttribute('onmouseenter');
			el.removeAttribute('onmouseleave');
			el.removeAttribute('onmousedown');
			el.removeAttribute('onmouseup');
			el.removeAttribute('onmousemove');
			el.removeAttribute('onkeydown');
			el.removeAttribute('onkeyup');
			el.removeAttribute('onkeypress');
			el.removeAttribute('onfocus');
			el.removeAttribute('onblur');
			el.removeAttribute('onchange');
			el.removeAttribute('onsubmit');
			el.removeAttribute('onreset');
			el.removeAttribute('onselect');
			el.removeAttribute('onabort');
			el.removeAttribute('oncanplay');
			el.removeAttribute('oncanplaythrough');
			el.removeAttribute('ondurationchange');
			el.removeAttribute('onemptied');
			el.removeAttribute('onended');
			el.removeAttribute('onerror');
			el.removeAttribute('onloadeddata');
			el.removeAttribute('onloadedmetadata');
			el.removeAttribute('onloadstart');
			el.removeAttribute('onpause');
			el.removeAttribute('onplay');
			el.removeAttribute('onplaying');
			el.removeAttribute('onprogress');
			el.removeAttribute('onratechange');
			el.removeAttribute('onreadystatechange');
			el.removeAttribute('onseeked');
			el.removeAttribute('onseeking');
			el.removeAttribute('onstalled');
			el.removeAttribute('onsuspend');
			el.removeAttribute('ontimeupdate');
			el.removeAttribute('onvolumechange');
			el.removeAttribute('onwaiting');
		});

		// Convert relative URLs to absolute
		doc.querySelectorAll('a[href]').forEach((link) => {
			try {
				const href = link.getAttribute('href');
				if (href && !href.startsWith('http')) {
					const absoluteUrl = new URL(href, article.url).toString();
					link.setAttribute('href', absoluteUrl);
				}
			} catch (e) {
				console.error('Error converting URL:', e);
			}
		});

		// Get the sanitized content
		let sanitizedContent = doc.body.innerHTML;

		// Clean up any remaining script-like content
		sanitizedContent = sanitizedContent
			.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
			.replace(/javascript:/gi, '')
			.replace(/data:/gi, '')
			.replace(/vbscript:/gi, '')
			.replace(/on\w+="[^"]*"/g, '')
			.replace(/on\w+='[^']*'/g, '')
			.replace(/style="[^"]*"/g, '')
			.replace(/style='[^']*'/g, '');

		return sanitizedContent;
	}

	// Function to handle bookmarking
	async function handleBookmark() {
		if (!bookmarkEnabled) return;

		const bookmarkedArticles = $yakklBookmarkedArticlesStore;

		if ($isBookmarked) {
			// Remove from bookmarks
			const updatedArticles = bookmarkedArticles.filter(
				(a) => !(a.title === article.title && a.source === article.source)
			);
			await setYakklBookmarkedArticles(updatedArticles);
			// Also remove from enhanced bookmarks
			await enhancedBookmarkStore.removeBookmarkByUrl(article.url);
		} else {
			// Check for duplicates before adding
			const isDuplicate = bookmarkedArticles.some(
				(a) => a.title === article.title && a.source === article.source
			);

			if (!isDuplicate) {
				// Add to bookmarks only if not a duplicate - prepend to show at top
				const updatedArticles = [article, ...bookmarkedArticles];
				await setYakklBookmarkedArticles(updatedArticles);
				
				// Also add to enhanced bookmarks
				await enhancedBookmarkStore.addBookmark({
					url: article.url || '',
					title: article.title || 'Untitled',
					description: article.description || article.content || '',
					imageUrl: article.imageUrl || '/images/logoBull48x48.png',
					contentType: article.contentType || 'article',
					source: article.source || '',
					tags: article.categories || [],
					notes: []
				});
			}
		}
	}

	// Function to handle deletion
	async function handleDelete() {
		if (!deleteEnabled) return;

		if (onDelete) {
			await onDelete(article);
		} else {
			await handleBookmark(); // Fallback to bookmark logic if no onDelete provided
		}

		showDeleteConfirmation = false;
	}

	// Prints out the full article in a new window
	// Example usage:
	// <button onclick="printFullArticle('https://news.example.com/article/123')">
	//   🖨️ Print Full Article
	// </button>
	function printFullArticle(articleUrl: string) {
		const printWindow = window.open(articleUrl, '_blank');

		printWindow.onload = () => {
			printWindow.focus();
			printWindow.print();
		};
	}

	// Function to handle printing
	function handlePrint(articleUrl: string = '') {
		// if (articleUrl) {
		//   console.log('Printing article from external source', articleUrl);
		//   printFullArticle(articleUrl); // Optional external print
		//   return;
		// }

		console.log('Printing article from internal source', articleUrl);
		const sanitizedContent = sanitizeContent(
			article.content || article.description || article.title
		);
		const html = generatePrintHtml(article, sanitizedContent);

		const printWindow = window.open('', '_blank');
		if (!printWindow) {
			console.error('Failed to open print window');
			return;
		}

		// Wait until the new window DOM is available
		printWindow.document.open();
		printWindow.document.write(html);
		printWindow.document.close();

		// Ensure content loads before printing
		printWindow.onload = () => {
			printWindow.focus();
			printWindow.print();
		};

		// const doc = printWindow.document;
		// doc.open();
		// doc.write(`
		//   <!DOCTYPE html>
		//   <html>
		//     <head>
		//       <title>${article.title}</title>
		//       <meta charset="utf-8">
		//       <link rel="shortcut icon" href="https://yakkl.com/images/favicon.png" />
		//       <style>
		//         body {
		//           font-family: Arial, sans-serif;
		//           padding: 20px;
		//           max-width: 800px;
		//           margin: 0 auto;
		//           color: #333;
		//         }
		//         .header {
		//           margin-bottom: 20px;
		//           border-bottom: 1px solid #eee;
		//           padding-bottom: 20px;
		//         }
		//         .metadata {
		//           color: #666;
		//           font-size: 0.9em;
		//           margin: 10px 0;
		//         }
		//         .metadata span {
		//           margin-right: 15px;
		//         }
		//         .content {
		//           line-height: 1.6;
		//           font-size: 1.1em;
		//           white-space: pre-wrap;
		//           margin: 20px 0;
		//         }
		//         .content img {
		//           max-width: 100%;
		//           height: auto;
		//           margin: 10px 0;
		//         }
		//         .content a {
		//           color: #0066cc;
		//           text-decoration: none;
		//         }
		//         .content a:hover {
		//           text-decoration: underline;
		//         }
		//         .tags {
		//           margin-top: 20px;
		//           padding-top: 20px;
		//           border-top: 1px solid #eee;
		//         }
		//         .tag {
		//           display: inline-block;
		//           background: #f0f0f0;
		//           padding: 3px 8px;
		//           border-radius: 3px;
		//           margin-right: 5px;
		//           font-size: 0.9em;
		//         }
		//         .source-link {
		//           margin-top: 20px;
		//           font-size: 0.9em;
		//           color: #666;
		//           border-top: 1px solid #eee;
		//           padding-top: 20px;
		//         }
		//         @media print {
		//           body { padding: 0; }
		//           .header { border-bottom: 1px solid #000; }
		//           .tags { border-top: 1px solid #000; }
		//           .source-link { border-top: 1px solid #000; }
		//         }
		//       </style>
		//     </head>
		//     <body>
		//       <div class="header">
		//         <h1>${article.title}</h1>
		//         <div class="metadata">
		//           <span><strong>Source:</strong> ${article.source}</span>
		//           ${article.author ? `<span><strong>Author:</strong> ${article.author}</span>` : ''}
		//           <span><strong>Published:</strong> ${article.publishedAt || article.date}</span>
		//         </div>
		//       </div>
		//       <div class="content">
		//         ${sanitizedContent}
		//       </div>
		//       ${article.categories && article.categories.length > 0 ? `
		//         <div class="tags">
		//           Tags: ${article.categories.map((tag: string) => `<span class="tag">${tag}</span>`).join('')}
		//         </div>
		//       ` : ''}
		//       <div class="source-link">
		//         <p>Source: <a href="${article.url}" target="_blank">${article.url}</a></p>
		//         <p>Printed on: ${new Date().toLocaleString()}</p>
		//         <p>Printed by: <a href="https://yakkl.com/?utm_source=yakkl-wallet&utm_medium=print&utm_campaign=${encodeURIComponent(article.source)}&utm_content=${encodeURIComponent(article.title)}" target="_blank">YAKKL Smart Wallet</a></p>
		//       </div>
		//     </body>
		//   </html>
		// `);
		// doc.close();

		// Ensure the content is loaded before printing
		// setTimeout(() => {
		//   printWindow.focus();
		//   printWindow.print();
		// }, 500);
	}

	// Not for printing from extension context. Use in normal browser context window.
	function printArticle(article: RSSItem, sanitizedContent: string) {
		const iframe = document.createElement('iframe');
		iframe.style.position = 'fixed';
		iframe.style.right = '0';
		iframe.style.bottom = '0';
		iframe.style.width = '0';
		iframe.style.height = '0';
		iframe.style.border = 'none';

		// Set the HTML via srcdoc
		iframe.srcdoc = generatePrintHtml(article, sanitizedContent);

		document.body.appendChild(iframe);

		iframe.onload = () => {
			iframe.contentWindow.focus();
			iframe.contentWindow.print();
			// Optionally remove the iframe afterward
			setTimeout(() => iframe.remove(), 1000);
		};
	}

	function generatePrintHtml(article: RSSItem, sanitizedContent: string) {
		return `
    <!DOCTYPE html>
      <html>
        <head>
          <title>${article.title}</title>
          <meta charset="utf-8">
          <link rel="shortcut icon" href="https://yakkl.com/images/favicon.png" />
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              max-width: 800px;
              margin: 0 auto;
              color: #333;
            }
            .header {
              margin-bottom: 20px;
              border-bottom: 1px solid #eee;
              padding-bottom: 20px;
            }
            .metadata {
              color: #666;
              font-size: 0.9em;
              margin: 10px 0;
            }
            .metadata span {
              margin-right: 15px;
            }
            .content {
              line-height: 1.6;
              font-size: 1.1em;
              white-space: pre-wrap;
              margin: 20px 0;
            }
            .content img {
              max-width: 100%;
              height: auto;
              margin: 10px 0;
            }
            .content a {
              color: #0066cc;
              text-decoration: none;
            }
            .content a:hover {
              text-decoration: underline;
            }
            .tags {
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #eee;
            }
            .tag {
              display: inline-block;
              background: #f0f0f0;
              padding: 3px 8px;
              border-radius: 3px;
              margin-right: 5px;
              font-size: 0.9em;
            }
            .source-link {
              margin-top: 20px;
              font-size: 0.9em;
              color: #666;
              border-top: 1px solid #eee;
              padding-top: 20px;
            }
            @media print {
              body { padding: 0; }
              .header { border-bottom: 1px solid #000; }
              .tags { border-top: 1px solid #000; }
              .source-link { border-top: 1px solid #000; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${article.title}</h1>
            <div class="metadata">
              <span><strong>Source:</strong> ${article.source}</span>
              ${article.author ? `<span><strong>Author:</strong> ${article.author}</span>` : ''}
              <span><strong>Published:</strong> ${article.publishedAt || article.date}</span>
            </div>
          </div>
          <div class="content">
            ${sanitizedContent}
          </div>
          ${
						article.categories && article.categories.length > 0
							? `
            <div class="tags">
              Tags: ${article.categories.map((tag: string) => `<span class="tag">${tag}</span>`).join('')}
            </div>
          `
							: ''
					}
          <div class="source-link">
            <p>Source: <a href="${article.url}" target="_blank">${article.url}</a></p>
            <p>Printed on: ${new Date().toLocaleString()}</p>
            <p>Printed by: <a href="https://yakkl.com/?utm_source=yakkl-wallet&utm_medium=print&utm_campaign=${encodeURIComponent(article.source)}&utm_content=${encodeURIComponent(article.title)}" target="_blank">YAKKL Smart Wallet</a></p>
          </div>
        </body>
      </html>
    `;
	}
</script>

<div
	class="absolute top-1 right-1 flex items-center gap-1 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-full p-1.5 shadow-lg z-10 transition-all duration-200 opacity-0 group-hover:opacity-100"
>
	{#if bookmarkEnabled}
		<button
			class="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
			title={$isBookmarked ? 'Unbookmark article' : 'Bookmark article'}
			aria-label={$isBookmarked ? 'Unbookmark article' : 'Bookmark article'}
			onclick={handleBookmark}
		>
			<svg 
				xmlns="http://www.w3.org/2000/svg" 
				viewBox="0 0 24 24" 
				stroke-width="1.5" 
				class="w-5 h-5 {$isBookmarked ? 'fill-yellow-400 stroke-yellow-400' : 'fill-none stroke-gray-600 dark:stroke-gray-400'}"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z"
				/>
			</svg>
		</button>
	{/if}
	
	{#if printEnabled}
		<button
			class="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
			title="Print article"
			aria-label="Print article"
			onclick={() => handlePrint(article.url)}
		>
			<PrinterIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
		</button>
	{/if}

	{#if deleteEnabled}
		<button
			class="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
			title="Delete article"
			aria-label="Delete article"
			onclick={() => (showDeleteConfirmation = true)}
		>
			<TrashIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
		</button>
	{/if}
</div>

{#if showDeleteConfirmation}
	<Confirmation
		show={showDeleteConfirmation}
		title="Delete Article"
		message="Are you sure you want to delete this article?"
		onConfirm={handleDelete}
		onCancel={() => {
			showDeleteConfirmation = false;
		}}
	/>
{/if}
