const PAPERLESS_URL = process.env.PAPERLESS_URL || 'http://localhost:8010';
const PAPERLESS_TOKEN = process.env.PAPERLESS_TOKEN || '';

/**
 * Returns true if Paperless-ngx is configured (URL and token are set).
 */
export function isPaperlessConfigured() {
	return !!(PAPERLESS_URL && PAPERLESS_TOKEN);
}

/**
 * Build headers for Paperless API requests.
 */
function headers(extra = {}) {
	return {
		Authorization: `Token ${PAPERLESS_TOKEN}`,
		...extra
	};
}

/**
 * Internal helper — makes a fetch request to the Paperless API.
 */
async function paperlessFetch(path, options = {}) {
	const url = `${PAPERLESS_URL.replace(/\/+$/, '')}${path}`;
	try {
		const res = await fetch(url, {
			...options,
			headers: {
				...headers(),
				...options.headers
			}
		});
		if (!res.ok) {
			console.error(`Paperless API error: ${res.status} ${res.statusText} for ${path}`);
			return null;
		}
		const contentType = res.headers.get('content-type') || '';
		if (contentType.includes('application/json')) {
			return await res.json();
		}
		return await res.text();
	} catch (err) {
		console.error(`Paperless API request failed for ${path}:`, err?.message || err);
		return null;
	}
}

/**
 * Upload a document to Paperless-ngx.
 *
 * @param {Buffer|ReadableStream|Blob} file - The file content
 * @param {object} metadata
 * @param {string} [metadata.title] - Document title
 * @param {string} [metadata.correspondent] - Correspondent name or ID
 * @param {number[]} [metadata.tags] - Array of tag IDs
 * @param {string} [metadata.document_type] - Document type name or ID
 * @param {string} [metadata.filename] - Original filename
 * @returns {Promise<string|null>} Task ID or null on failure
 */
export async function paperlessUpload(file, metadata = {}) {
	if (!isPaperlessConfigured()) return null;

	try {
		const formData = new FormData();

		if (file instanceof Blob) {
			formData.append('document', file, metadata.filename || 'upload');
		} else if (Buffer.isBuffer(file)) {
			const blob = new Blob([file]);
			formData.append('document', blob, metadata.filename || 'upload');
		} else {
			formData.append('document', file, metadata.filename || 'upload');
		}

		if (metadata.title) formData.append('title', metadata.title);
		if (metadata.correspondent) formData.append('correspondent', String(metadata.correspondent));
		if (metadata.document_type) formData.append('document_type', String(metadata.document_type));
		if (metadata.tags && metadata.tags.length > 0) {
			for (const tag of metadata.tags) {
				formData.append('tags', String(tag));
			}
		}

		const url = `${PAPERLESS_URL.replace(/\/+$/, '')}/api/documents/post_document/`;
		const res = await fetch(url, {
			method: 'POST',
			headers: {
				Authorization: `Token ${PAPERLESS_TOKEN}`
			},
			body: formData
		});

		if (!res.ok) {
			console.error(`Paperless upload error: ${res.status} ${res.statusText}`);
			return null;
		}

		const text = await res.text();
		// Paperless returns the task UUID as a plain string (quoted)
		return text.replace(/"/g, '').trim() || null;
	} catch (err) {
		console.error('Paperless upload failed:', err?.message || err);
		return null;
	}
}

/**
 * List documents with optional filters.
 *
 * @param {object} [filters]
 * @param {string} [filters.query] - Full-text search query
 * @param {number[]} [filters.tags] - Filter by tag IDs
 * @param {number} [filters.correspondent] - Filter by correspondent ID
 * @param {number} [filters.page] - Page number (1-based)
 * @param {number} [filters.page_size] - Results per page
 * @returns {Promise<object|null>} Paginated results or null
 */
export async function paperlessList(filters = {}) {
	if (!isPaperlessConfigured()) return null;

	const params = new URLSearchParams();
	if (filters.query) params.set('query', filters.query);
	if (filters.correspondent) params.set('correspondent__id', String(filters.correspondent));
	if (filters.page) params.set('page', String(filters.page));
	if (filters.page_size) params.set('page_size', String(filters.page_size));
	if (filters.tags && filters.tags.length > 0) {
		params.set('tags__id__in', filters.tags.join(','));
	}
	params.set('ordering', '-created');

	const qs = params.toString();
	return paperlessFetch(`/api/documents/${qs ? `?${qs}` : ''}`);
}

/**
 * Get a single document by ID.
 *
 * @param {number|string} id
 * @returns {Promise<object|null>}
 */
export async function paperlessGet(id) {
	if (!isPaperlessConfigured()) return null;
	return paperlessFetch(`/api/documents/${id}/`);
}

/**
 * Get the download URL for a document.
 *
 * @param {number|string} id
 * @returns {string}
 */
export function paperlessDownloadUrl(id) {
	return `${PAPERLESS_URL.replace(/\/+$/, '')}/api/documents/${id}/download/`;
}

/**
 * Search documents by query string.
 *
 * @param {string} query
 * @returns {Promise<object|null>}
 */
export async function paperlessSearch(query) {
	if (!isPaperlessConfigured()) return null;
	return paperlessList({ query });
}

/**
 * Create a new tag.
 *
 * @param {string} name
 * @param {string} [color] - Hex color code (e.g. "#ff0000")
 * @returns {Promise<object|null>}
 */
export async function paperlessCreateTag(name, color) {
	if (!isPaperlessConfigured()) return null;

	const body = { name };
	if (color) body.color = color;

	return paperlessFetch('/api/tags/', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

/**
 * List all tags.
 *
 * @returns {Promise<object|null>}
 */
export async function paperlessListTags() {
	if (!isPaperlessConfigured()) return null;
	return paperlessFetch('/api/tags/?page_size=1000');
}
