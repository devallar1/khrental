import { paginateQuery, runQuery, runSingleQuery } from './query.js';
import { getMssqlPool, sql } from './pool.js';

const DEFAULT_PAGE_SIZE = 50;
const APP_USER_MUTABLE_FIELDS = [
  'auth_id',
  'email',
  'name',
  'role',
  'user_type',
  'contact_details',
  'skills',
  'availability',
  'notes',
  'status',
  'active',
  'invited',
  'id_copy_url',
  'associated_property_ids',
  'national_id',
  'permanent_address',
  'profile_image_url'
];
const APP_USER_CREATABLE_FIELDS = new Set([
  'id',
  ...APP_USER_MUTABLE_FIELDS,
  'createdat',
  'updatedat'
]);
const APP_USER_JSON_FIELDS = new Set([
  'contact_details',
  'skills',
  'availability',
  'associated_property_ids'
]);
const AGREEMENT_UPDATABLE_FIELDS = [
  'templateid',
  'renteeid',
  'propertyid',
  'unitid',
  'status',
  'startdate',
  'enddate',
  'rentamount',
  'depositamount',
  'documenturl',
  'signeddocumenturl',
  'evia_document_id',
  'title',
  'content',
  'processedcontent',
  'terms',
  'notes',
  'needs_document_generation',
  'eviasignreference',
  'signature_status',
  'signature_sent_at',
  'signeddate',
  'cancellation_reason'
];
const AGREEMENT_TEMPLATE_UPDATABLE_FIELDS = [
  'name',
  'language',
  'content',
  'version',
  'updatedat'
];
const INVOICE_UPDATABLE_FIELDS = [
  'renteeid',
  'propertyid',
  'billingperiod',
  'components',
  'totalamount',
  'status',
  'paymentproofurl',
  'paymentdate',
  'duedate',
  'notes',
  'updatedat'
];
const INVOICE_JSON_FIELDS = new Set(['components']);

const parseJsonValue = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return value;
  }
};

const serializeDbValue = (key, value) => {
  if (value === undefined) {
    return value;
  }

  if (APP_USER_JSON_FIELDS.has(key) && value !== null && typeof value !== 'string') {
    return JSON.stringify(value);
  }

  return value;
};

const mapAppUserRow = (row) => {
  if (!row) {
    return null;
  }

  const appUser = {};

  Object.entries(row).forEach(([key, value]) => {
    appUser[key] = APP_USER_JSON_FIELDS.has(key)
      ? parseJsonValue(value)
      : value;
  });

  return appUser;
};

const createNestedEntity = (row, prefix) => {
  const nested = {};

  Object.entries(row).forEach(([key, value]) => {
    if (!key.startsWith(`${prefix}__`)) {
      return;
    }

    const nestedKey = key.slice(prefix.length + 2);
    nested[nestedKey] = parseJsonValue(value);
  });

  return Object.values(nested).some((value) => value !== null && value !== undefined)
    ? nested
    : null;
};

const mapAgreementRow = (row) => {
  const agreement = {};

  Object.entries(row).forEach(([key, value]) => {
    if (key.includes('__')) {
      return;
    }

    agreement[key] = parseJsonValue(value);
  });

  agreement.properties = createNestedEntity(row, 'property');
  agreement.property = agreement.properties;
  agreement.property_units = createNestedEntity(row, 'unit');
  agreement.unit = agreement.property_units;
  agreement.rentee = createNestedEntity(row, 'rentee');
  agreement.template = createNestedEntity(row, 'template');

  return agreement;
};

const mapInvoiceRow = (row) => {
  if (!row) {
    return null;
  }

  const invoice = {};

  Object.entries(row).forEach(([key, value]) => {
    invoice[key] = INVOICE_JSON_FIELDS.has(key)
      ? parseJsonValue(value)
      : value;
  });

  return invoice;
};

const AGREEMENT_SELECT = `
  SELECT
    a.*,
    p.id AS property__id,
    p.name AS property__name,
    p.address AS property__address,
    p.images AS property__images,
    p.propertytype AS property__propertytype,
    p.status AS property__status,
    u.id AS unit__id,
    u.unitnumber AS unit__unitnumber,
    u.floor AS unit__floor,
    u.status AS unit__status,
    r.id AS rentee__id,
    r.name AS rentee__name,
    r.email AS rentee__email,
    r.contact_details AS rentee__contact_details,
    t.id AS template__id,
    t.name AS template__name
  FROM agreements a
  LEFT JOIN properties p ON p.id = a.propertyid
  LEFT JOIN property_units u ON u.id = a.unitid
  LEFT JOIN app_users r ON r.id = a.renteeid
  LEFT JOIN agreement_templates t ON t.id = a.templateid
`;

export const getCurrentUserProfile = async ({ authId, userId, email }) => {
  if (authId) {
    const authUser = await runSingleQuery(
      `SELECT TOP 1 *
       FROM app_users
       WHERE auth_id = @authId`,
      { authId }
    );

    if (authUser) {
      return mapAppUserRow(authUser);
    }
  }

  if (userId) {
    const user = await runSingleQuery(
      `SELECT TOP 1 *
       FROM app_users
       WHERE id = @userId`,
      { userId }
    );

    return mapAppUserRow(user);
  }

  if (email) {
    const user = await runSingleQuery(
      `SELECT TOP 1 *
       FROM app_users
       WHERE email = @email`,
      { email }
    );

    return mapAppUserRow(user);
  }

  return null;
};

export const getAppUserById = async (id) => {
  const user = await runSingleQuery(
    `SELECT TOP 1 *
     FROM app_users
     WHERE id = @id`,
    { id }
  );

  return mapAppUserRow(user);
};

export const findAppUserByEmail = async (email) => {
  const user = await runSingleQuery(
    `SELECT TOP 1 *
     FROM app_users
     WHERE email = @email`,
    { email }
  );

  return mapAppUserRow(user);
};

export const findAppUserByAuthId = async (authId) => {
  const user = await runSingleQuery(
    `SELECT TOP 1 *
     FROM app_users
     WHERE auth_id = @authId`,
    { authId }
  );

  return mapAppUserRow(user);
};

export const listAppUsers = async ({ userType, email, authId, page = 1, pageSize = DEFAULT_PAGE_SIZE } = {}) => {
  const filters = [];
  const params = {};

  if (userType) {
    filters.push('user_type = @userType');
    params.userType = userType;
  }

  if (email) {
    filters.push('email = @email');
    params.email = email;
  }

  if (authId) {
    filters.push('auth_id = @authId');
    params.authId = authId;
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  const rows = await paginateQuery({
    baseQuery: `SELECT * FROM app_users ${whereClause}`,
    orderBy: 'createdat DESC',
    page,
    pageSize,
    params
  });

  return rows.map(mapAppUserRow);
};

export const createAppUser = async (payload = {}) => {
  const now = new Date().toISOString();
  const normalizedPayload = {
    ...payload,
    email: payload.email || payload.contact_details?.email || payload.contactDetails?.email || null,
    contact_details: payload.contact_details || payload.contactDetails || null,
    profile_image_url: payload.profile_image_url || payload.profileImageUrl || null,
    createdat: payload.createdat || now,
    updatedat: now
  };

  const entries = Object.entries(normalizedPayload).filter(([key, value]) => APP_USER_CREATABLE_FIELDS.has(key) && value !== undefined);
  const params = {};
  const columns = [];
  const values = [];

  entries.forEach(([key, value], index) => {
    const paramKey = `value${index}`;
    columns.push(key);
    values.push(`@${paramKey}`);
    params[paramKey] = serializeDbValue(key, value);
  });

  const rows = await runQuery(
    `INSERT INTO app_users (${columns.join(', ')})
     OUTPUT INSERTED.*
     VALUES (${values.join(', ')})`,
    params
  );

  return mapAppUserRow(rows[0] || null);
};

export const updateAppUser = async (id, payload = {}) => {
  const entries = Object.entries(payload).filter(([key, value]) => APP_USER_MUTABLE_FIELDS.includes(key) && value !== undefined);

  if (entries.length === 0) {
    return getAppUserById(id);
  }

  const params = { id, updatedat: new Date().toISOString() };
  const assignments = entries.map(([key, value], index) => {
    const paramKey = `value${index}`;
    params[paramKey] = serializeDbValue(key, value);
    return `${key} = @${paramKey}`;
  });

  assignments.push('updatedat = @updatedat');

  const rows = await runQuery(
    `UPDATE app_users
     SET ${assignments.join(', ')}
     OUTPUT INSERTED.*
     WHERE id = @id`,
    params
  );

  return mapAppUserRow(rows[0] || null);
};

export const linkAuthUserToAppUser = async (id, authId) => updateAppUser(id, {
  auth_id: authId,
  invited: true
});

export const deleteAppUserById = async (id) => {
  const rows = await runQuery(
    `DELETE FROM app_users
     OUTPUT DELETED.*
     WHERE id = @id`,
    { id }
  );

  return mapAppUserRow(rows[0] || null);
};

export const getAppUserInvitationStatus = async (id) => {
  const user = await runSingleQuery(
    `SELECT TOP 1 id, email, invited, auth_id
     FROM app_users
     WHERE id = @id`,
    { id }
  );

  if (!user) {
    return null;
  }

  return {
    ...user,
    status: user.auth_id ? 'registered' : (user.invited ? 'invited' : 'not_invited')
  };
};

export const listProperties = async ({ page = 1, pageSize = DEFAULT_PAGE_SIZE } = {}) => paginateQuery({
  baseQuery: 'SELECT * FROM properties',
  orderBy: 'createdat DESC',
  page,
  pageSize,
  params: {}
});

export const getPropertyById = async (id) => runSingleQuery(
  `SELECT TOP 1 *
   FROM properties
   WHERE id = @id`,
  { id }
);

export const updatePropertyById = async (id, payload = {}) => {
  const mutableFields = ['status', 'updatedat'];
  const entries = Object.entries(payload).filter(([key, value]) => mutableFields.includes(key) && value !== undefined);

  if (entries.length === 0) {
    return getPropertyById(id);
  }

  const params = { id, updatedat: payload.updatedat || new Date().toISOString() };
  const assignments = entries.map(([key, value], index) => {
    const paramKey = `value${index}`;
    params[paramKey] = value;
    return `${key} = @${paramKey}`;
  });

  if (!entries.some(([key]) => key === 'updatedat')) {
    assignments.push('updatedat = @updatedat');
  }

  const rows = await runQuery(
    `UPDATE properties
     SET ${assignments.join(', ')}
     OUTPUT INSERTED.*
     WHERE id = @id`,
    params
  );

  return rows[0] || null;
};

export const listPropertyUnits = async ({ propertyId, page = 1, pageSize = DEFAULT_PAGE_SIZE } = {}) => {
  const filters = [];
  const params = {};

  if (propertyId) {
    filters.push('propertyid = @propertyId');
    params.propertyId = propertyId;
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

  return paginateQuery({
    baseQuery: `SELECT * FROM property_units ${whereClause}`,
    orderBy: 'createdat DESC',
    page,
    pageSize,
    params
  });
};

export const listAgreementTemplates = async ({ language, page = 1, pageSize = DEFAULT_PAGE_SIZE } = {}) => {
  const filters = [];
  const params = {};

  if (language) {
    filters.push('language = @language');
    params.language = language;
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

  return paginateQuery({
    baseQuery: `SELECT * FROM agreement_templates ${whereClause}`,
    orderBy: 'name ASC',
    page,
    pageSize,
    params
  });
};

export const getAgreementTemplateById = async (id) => runSingleQuery(
  `SELECT TOP 1 *
   FROM agreement_templates
   WHERE id = @id`,
  { id }
);

export const createAgreementTemplate = async (payload = {}) => {
  const now = new Date().toISOString();
  const {
    id = null,
    name = null,
    language = 'English',
    content = null,
    version = '1.0'
  } = payload;

  const rows = await runQuery(
    `INSERT INTO agreement_templates (
      id,
      name,
      language,
      content,
      version,
      createdat,
      updatedat
    )
    OUTPUT INSERTED.*
    VALUES (
      COALESCE(@id, NEWID()),
      @name,
      @language,
      @content,
      @version,
      @createdat,
      @updatedat
    )`,
    {
      id,
      name,
      language,
      content,
      version,
      createdat: now,
      updatedat: now
    }
  );

  return rows[0] || null;
};

export const updateAgreementTemplate = async (id, payload = {}) => {
  const entries = Object.entries(payload).filter(([key, value]) => AGREEMENT_TEMPLATE_UPDATABLE_FIELDS.includes(key) && value !== undefined);

  if (entries.length === 0) {
    return getAgreementTemplateById(id);
  }

  const params = { id, updatedat: payload.updatedat || new Date().toISOString() };
  const assignments = entries.map(([key, value], index) => {
    const paramKey = `value${index}`;
    params[paramKey] = value;
    return `${key} = @${paramKey}`;
  });

  if (!entries.some(([key]) => key === 'updatedat')) {
    assignments.push('updatedat = @updatedat');
  }

  const rows = await runQuery(
    `UPDATE agreement_templates
     SET ${assignments.join(', ')}
     OUTPUT INSERTED.*
     WHERE id = @id`,
    params
  );

  return rows[0] || null;
};

export const deleteAgreementTemplateById = async (id) => {
  const rows = await runQuery(
    `DELETE FROM agreement_templates
     OUTPUT DELETED.*
     WHERE id = @id`,
    { id }
  );

  return rows[0] || null;
};

export const getPropertyUnitById = async (id) => runSingleQuery(
  `SELECT TOP 1 *
   FROM property_units
   WHERE id = @id`,
  { id }
);

export const listInvoices = async ({
  propertyId,
  renteeId,
  status,
  billingPeriod,
  fromDate,
  toDate,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE
} = {}) => {
  const filters = [];
  const params = {};

  if (propertyId) {
    filters.push('propertyid = @propertyId');
    params.propertyId = propertyId;
  }

  if (renteeId) {
    filters.push('renteeid = @renteeId');
    params.renteeId = renteeId;
  }

  if (status) {
    filters.push('status = @status');
    params.status = status;
  }

  if (billingPeriod) {
    filters.push('billingperiod = @billingPeriod');
    params.billingPeriod = billingPeriod;
  }

  if (fromDate) {
    filters.push('createdat >= @fromDate');
    params.fromDate = fromDate;
  }

  if (toDate) {
    filters.push('createdat <= @toDate');
    params.toDate = toDate;
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  const rows = await paginateQuery({
    baseQuery: `SELECT * FROM invoices ${whereClause}`,
    orderBy: 'createdat DESC',
    page,
    pageSize,
    params
  });

  return rows.map(mapInvoiceRow);
};

export const getInvoiceById = async (id) => {
  const row = await runSingleQuery(
    `SELECT TOP 1 *
     FROM invoices
     WHERE id = @id`,
    { id }
  );

  return mapInvoiceRow(row);
};

export const createInvoice = async (payload = {}) => {
  const now = new Date().toISOString();
  const {
    id = null,
    renteeid = null,
    propertyid = null,
    billingperiod = null,
    components = null,
    totalamount = null,
    status = 'pending',
    paymentproofurl = null,
    paymentdate = null,
    duedate = null,
    notes = null
  } = payload;

  const rows = await runQuery(
    `INSERT INTO invoices (
      id,
      renteeid,
      propertyid,
      billingperiod,
      components,
      totalamount,
      status,
      paymentproofurl,
      paymentdate,
      duedate,
      notes,
      createdat,
      updatedat
    )
    OUTPUT INSERTED.*
    VALUES (
      COALESCE(@id, NEWID()),
      @renteeid,
      @propertyid,
      @billingperiod,
      @components,
      @totalamount,
      @status,
      @paymentproofurl,
      @paymentdate,
      @duedate,
      @notes,
      @createdat,
      @updatedat
    )`,
    {
      id,
      renteeid,
      propertyid,
      billingperiod,
      components: components == null ? null : JSON.stringify(components),
      totalamount,
      status,
      paymentproofurl,
      paymentdate,
      duedate,
      notes,
      createdat: now,
      updatedat: now
    }
  );

  return mapInvoiceRow(rows[0] || null);
};

export const updateInvoice = async (id, payload = {}) => {
  const entries = Object.entries(payload).filter(([key, value]) => INVOICE_UPDATABLE_FIELDS.includes(key) && value !== undefined);

  if (entries.length === 0) {
    return getInvoiceById(id);
  }

  const params = { id, updatedat: payload.updatedat || new Date().toISOString() };
  const assignments = entries.map(([key, value], index) => {
    const paramKey = `value${index}`;
    params[paramKey] = INVOICE_JSON_FIELDS.has(key) && value !== null && typeof value !== 'string'
      ? JSON.stringify(value)
      : value;
    return `${key} = @${paramKey}`;
  });

  if (!entries.some(([key]) => key === 'updatedat')) {
    assignments.push('updatedat = @updatedat');
  }

  const rows = await runQuery(
    `UPDATE invoices
     SET ${assignments.join(', ')}
     OUTPUT INSERTED.*
     WHERE id = @id`,
    params
  );

  return mapInvoiceRow(rows[0] || null);
};

export const listAgreements = async ({ propertyId, renteeId, status, page = 1, pageSize = DEFAULT_PAGE_SIZE } = {}) => {
  const filters = [];
  const params = {};

  if (propertyId) {
    filters.push('propertyid = @propertyId');
    params.propertyId = propertyId;
  }

  if (renteeId) {
    filters.push('renteeid = @renteeId');
    params.renteeId = renteeId;
  }

  if (status) {
    filters.push('status = @status');
    params.status = status;
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

  const rows = await paginateQuery({
    baseQuery: `${AGREEMENT_SELECT} ${whereClause}`,
    orderBy: 'createdat DESC',
    page,
    pageSize,
    params
  });

  return rows.map(mapAgreementRow);
};

export const getAgreementById = async (id) => {
  const row = await runSingleQuery(
    `${AGREEMENT_SELECT}
     WHERE a.id = @id`,
    { id }
  );

  return row ? mapAgreementRow(row) : null;
};

export const createAgreement = async (payload) => {
  const now = new Date().toISOString();
  const {
    templateid = null,
    renteeid = null,
    propertyid = null,
    unitid = null,
    status = 'draft',
    startdate = null,
    enddate = null,
    rentamount = null,
    depositamount = null,
    documenturl = null,
    signeddocumenturl = null,
    evia_document_id = null,
    title = null,
    content = null,
    processedcontent = null
  } = payload;

  const insertedRows = await runQuery(
    `INSERT INTO agreements (
      templateid,
      renteeid,
      propertyid,
      unitid,
      status,
      startdate,
      enddate,
      rentamount,
      depositamount,
      documenturl,
      signeddocumenturl,
      evia_document_id,
      title,
      content,
      processedcontent,
      createdat,
      updatedat
    )
    OUTPUT INSERTED.*
    VALUES (
      @templateid,
      @renteeid,
      @propertyid,
      @unitid,
      @status,
      @startdate,
      @enddate,
      @rentamount,
      @depositamount,
      @documenturl,
      @signeddocumenturl,
      @evia_document_id,
      @title,
      @content,
      @processedcontent,
      @createdat,
      @updatedat
    )`,
    {
      templateid,
      renteeid,
      propertyid,
      unitid,
      status,
      startdate,
      enddate,
      rentamount,
      depositamount,
      documenturl,
      signeddocumenturl,
      evia_document_id,
      title,
      content,
      processedcontent,
      createdat: now,
      updatedat: now
    }
  );

  return insertedRows[0] || null;
};

export const updateAgreement = async (id, payload) => {
  const entries = Object.entries(payload || {}).filter(([key]) => AGREEMENT_UPDATABLE_FIELDS.includes(key));

  if (entries.length === 0) {
    return getAgreementById(id);
  }

  const params = { id, updatedat: new Date().toISOString() };
  const assignments = entries.map(([key, value], index) => {
    const paramKey = `value${index}`;
    params[paramKey] = value;
    return `${key} = @${paramKey}`;
  });

  assignments.push('updatedat = @updatedat');

  const rows = await runQuery(
    `UPDATE agreements
     SET ${assignments.join(', ')}
     OUTPUT INSERTED.*
     WHERE id = @id`,
    params
  );

  return rows[0] ? getAgreementById(rows[0].id) : null;
};

export const deleteAgreementById = async (id) => {
  const rows = await runQuery(
    `DELETE FROM agreements
     OUTPUT DELETED.*
     WHERE id = @id`,
    { id }
  );

  return rows[0] || null;
};

export const markAgreementSigned = async (id) => {
  const pool = await getMssqlPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const agreementRequest = new sql.Request(transaction);
    agreementRequest.input('id', id);
    agreementRequest.input('signeddate', new Date().toISOString());
    agreementRequest.input('updatedat', new Date().toISOString());

    const agreementResult = await agreementRequest.query(`
      UPDATE agreements
      SET status = 'signed',
          signeddate = @signeddate,
          updatedat = @updatedat
      OUTPUT INSERTED.*
      WHERE id = @id
    `);

    const updatedAgreement = agreementResult.recordset[0];

    if (!updatedAgreement) {
      throw new Error('Agreement not found');
    }

    if (updatedAgreement.propertyid) {
      const propertyRequest = new sql.Request(transaction);
      propertyRequest.input('propertyId', updatedAgreement.propertyid);
      propertyRequest.input('updatedat', new Date().toISOString());
      await propertyRequest.query(`
        UPDATE properties
        SET status = 'available',
            updatedat = @updatedat
        WHERE id = @propertyId
      `);
    }

    if (updatedAgreement.unitid) {
      const unitRequest = new sql.Request(transaction);
      unitRequest.input('unitId', updatedAgreement.unitid);
      unitRequest.input('updatedat', new Date().toISOString());
      await unitRequest.query(`
        UPDATE property_units
        SET status = 'occupied',
            updatedat = @updatedat
        WHERE id = @unitId
      `);
    }

    if (updatedAgreement.renteeid && updatedAgreement.propertyid) {
      const userRequest = new sql.Request(transaction);
      userRequest.input('renteeId', updatedAgreement.renteeid);
      const userResult = await userRequest.query(`
        SELECT TOP 1 associated_property_ids
        FROM app_users
        WHERE id = @renteeId
      `);

      const currentRaw = userResult.recordset[0]?.associated_property_ids;
      const currentValue = parseJsonValue(currentRaw);
      const currentProperties = Array.isArray(currentValue) ? currentValue : [];

      if (!currentProperties.includes(updatedAgreement.propertyid)) {
        currentProperties.push(updatedAgreement.propertyid);
        const updateUserRequest = new sql.Request(transaction);
        updateUserRequest.input('renteeId', updatedAgreement.renteeid);
        updateUserRequest.input('associatedPropertyIds', JSON.stringify(currentProperties));
        updateUserRequest.input('updatedat', new Date().toISOString());
        await updateUserRequest.query(`
          UPDATE app_users
          SET associated_property_ids = @associatedPropertyIds,
              updatedat = @updatedat
          WHERE id = @renteeId
        `);
      }
    }

    await transaction.commit();
    return getAgreementById(id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
