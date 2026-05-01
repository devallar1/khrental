import { runSingleQuery, runQuery } from '$api/db/query.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals }) => {
	const userId = locals.user.id;
	const tenantId = locals.tenantId;

	// Pull the auth_user identity row alongside the app_users domain row,
	// since email/phone live in auth_user (the app_users.email is denormalised
	// and may be empty/stale for phone-only sign-ups).
	const identity = await runSingleQuery(
		`SELECT au."email"           AS auth_email,
		        au."phoneNumber"     AS auth_phone,
		        au."emailVerified"   AS auth_email_verified,
		        au."phoneNumberVerified" AS auth_phone_verified,
		        au."image"           AS auth_image,
		        au."createdAt"       AS auth_created_at
		   FROM auth_user au
		  WHERE au."id" = @authId
		  LIMIT 1`,
		{ authId: locals.user.auth_id }
	);

	// Properties associated to this rentee (via app_users.associated_property_ids).
	const associatedIds = Array.isArray(locals.user.associated_property_ids)
		? locals.user.associated_property_ids
		: [];

	let properties = [];
	if (associatedIds.length > 0 && tenantId) {
		properties = await runQuery(
			`SELECT id, name, address, propertytype
			   FROM properties
			  WHERE id = ANY(@ids::uuid[])
			    AND tenant_id = @tenantId
			  ORDER BY name ASC`,
			{ ids: associatedIds, tenantId }
		);
	}

	return {
		profile: {
			name: locals.user.name,
			role: 'rentee',
			email: identity?.auth_email || locals.user.email,
			phone: identity?.auth_phone || locals.user.contact_details?.phone || null,
			emailVerified: identity?.auth_email_verified || false,
			phoneVerified: identity?.auth_phone_verified || false,
			image: identity?.auth_image,
			national_id: locals.user.national_id,
			permanent_address: locals.user.permanent_address,
			memberSince: identity?.auth_created_at || locals.user.createdat
		},
		properties
	};
};
