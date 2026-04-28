import {
	isPaperlessConfigured,
	paperlessList,
	paperlessListTags,
	paperlessUpload,
	paperlessCreateTag
} from '$lib/server/paperless.js';
import { fail } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals }) => {
	const configured = isPaperlessConfigured();

	if (!configured) {
		return {
			configured: false,
			accessible: false,
			documents: [],
			tags: [],
			tenant: locals.tenant
		};
	}

	// Test accessibility by fetching documents and tags in parallel
	const [docsResult, tagsResult] = await Promise.all([
		paperlessList({ page: 1, page_size: 25 }),
		paperlessListTags()
	]);

	const accessible = docsResult !== null;

	return {
		configured,
		accessible,
		documents: docsResult?.results || [],
		totalDocuments: docsResult?.count || 0,
		tags: tagsResult?.results || [],
		tenant: locals.tenant
	};
};

/** @type {import('./$types').Actions} */
export const actions = {
	upload: async ({ request, locals }) => {
		if (!isPaperlessConfigured()) {
			return fail(400, { error: 'Paperless-ngx is not configured.' });
		}

		const formData = await request.formData();
		const file = formData.get('file');
		const title = formData.get('title');
		const selectedTags = formData.getAll('tags');

		if (!file || !(file instanceof File) || file.size === 0) {
			return fail(400, { error: 'Please select a file to upload.' });
		}

		// Collect tag IDs
		const tagIds = selectedTags.map((t) => Number(t)).filter((t) => !isNaN(t));

		// Ensure a tag exists for the current tenant
		if (locals.tenant?.name) {
			const tagsResult = await paperlessListTags();
			const allTags = tagsResult?.results || [];
			let tenantTag = allTags.find(
				(t) => t.name.toLowerCase() === locals.tenant.name.toLowerCase()
			);

			if (!tenantTag) {
				tenantTag = await paperlessCreateTag(locals.tenant.name, '#6366f1');
			}

			if (tenantTag?.id && !tagIds.includes(tenantTag.id)) {
				tagIds.push(tenantTag.id);
			}
		}

		const buffer = Buffer.from(await file.arrayBuffer());

		const taskId = await paperlessUpload(buffer, {
			title: title || file.name,
			tags: tagIds,
			filename: file.name
		});

		if (!taskId) {
			return fail(500, { error: 'Upload to Paperless-ngx failed. Check server logs.' });
		}

		return { success: true, taskId };
	}
};
