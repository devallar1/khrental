import express from 'express';
import { getMssqlConfigStatus, isMssqlConfigured } from './config.js';
import {
  createAppUser,
  createAgreement,
  createAgreementTemplate,
  createInvoice,
  deleteAppUserById,
  deleteAgreementById,
  deleteAgreementTemplateById,
  getAgreementById,
  getAgreementTemplateById,
  getAppUserById,
  getAppUserInvitationStatus,
  getCurrentUserProfile,
  getInvoiceById,
  getPropertyById,
  getPropertyUnitById,
  findAppUserByAuthId,
  findAppUserByEmail,
  linkAuthUserToAppUser,
  listAgreements,
  listAgreementTemplates,
  listAppUsers,
  listInvoices,
  listProperties,
  listPropertyUnits,
  markAgreementSigned,
  updateAppUser,
  updateAgreement,
  updateAgreementTemplate,
  updateInvoice,
  updatePropertyById
} from './repositories.js';

const asyncHandler = (handler) => async (req, res, next) => {
  try {
    await handler(req, res, next);
  } catch (error) {
    next(error);
  }
};

const getPagination = (req) => ({
  page: req.query.page,
  pageSize: req.query.pageSize
});

export const createMssqlRouter = () => {
  const router = express.Router();

  router.get('/health', (_req, res) => {
    res.json({
      ok: true,
      provider: 'mssql',
      ...getMssqlConfigStatus()
    });
  });

  router.use((req, res, next) => {
    if (!isMssqlConfigured()) {
      res.status(503).json({
        error: 'MSSQL is not configured.',
        required: [
          'MSSQL_SERVER',
          'MSSQL_DATABASE',
          'MSSQL_USER',
          'MSSQL_PASSWORD'
        ]
      });
      return;
    }

    next();
  });

  router.get('/me', asyncHandler(async (req, res) => {
    const authId = req.headers['x-auth-id'];
    const userId = req.headers['x-user-id'];
    const email = req.headers['x-user-email'];

    if (!authId && !userId && !email) {
      res.status(401).json({
        error: 'Missing identity headers. Provide x-auth-id, x-user-id, or x-user-email.'
      });
      return;
    }

    const user = await getCurrentUserProfile({ authId, userId, email });

    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    res.json({ data: user });
  }));

  router.get('/app-users', asyncHandler(async (req, res) => {
    const users = await listAppUsers({
      userType: req.query.userType,
      email: req.query.email,
      authId: req.query.authId,
      ...getPagination(req)
    });

    res.json({ data: users });
  }));

  router.get('/app-users/lookup', asyncHandler(async (req, res) => {
    const { email, authId } = req.query;

    if (!email && !authId) {
      res.status(400).json({ error: 'Provide email or authId.' });
      return;
    }

    const user = authId
      ? await findAppUserByAuthId(authId)
      : await findAppUserByEmail(email);

    res.json({ data: user || null });
  }));

  router.post('/app-users', asyncHandler(async (req, res) => {
    const user = await createAppUser(req.body || {});
    res.status(201).json({ data: user });
  }));

  router.get('/app-users/:id/invitation-status', asyncHandler(async (req, res) => {
    const status = await getAppUserInvitationStatus(req.params.id);

    if (!status) {
      res.status(404).json({ error: 'App user not found.' });
      return;
    }

    res.json({ data: status });
  }));

  router.get('/app-users/:id', asyncHandler(async (req, res) => {
    const user = await getAppUserById(req.params.id);

    if (!user) {
      res.status(404).json({ error: 'App user not found.' });
      return;
    }

    res.json({ data: user });
  }));

  router.put('/app-users/:id', asyncHandler(async (req, res) => {
    const user = await updateAppUser(req.params.id, req.body || {});

    if (!user) {
      res.status(404).json({ error: 'App user not found.' });
      return;
    }

    res.json({ data: user });
  }));

  router.post('/app-users/:id/link', asyncHandler(async (req, res) => {
    const { authId } = req.body || {};

    if (!authId) {
      res.status(400).json({ error: 'authId is required.' });
      return;
    }

    const user = await linkAuthUserToAppUser(req.params.id, authId);

    if (!user) {
      res.status(404).json({ error: 'App user not found.' });
      return;
    }

    res.json({ data: user });
  }));

  router.delete('/app-users/:id', asyncHandler(async (req, res) => {
    const user = await deleteAppUserById(req.params.id);

    if (!user) {
      res.status(404).json({ error: 'App user not found.' });
      return;
    }

    res.json({ data: user });
  }));

  router.get('/properties', asyncHandler(async (req, res) => {
    const properties = await listProperties(getPagination(req));
    res.json({ data: properties });
  }));

  router.get('/properties/:id', asyncHandler(async (req, res) => {
    const property = await getPropertyById(req.params.id);

    if (!property) {
      res.status(404).json({ error: 'Property not found.' });
      return;
    }

    res.json({ data: property });
  }));

  router.put('/properties/:id', asyncHandler(async (req, res) => {
    const property = await updatePropertyById(req.params.id, req.body || {});

    if (!property) {
      res.status(404).json({ error: 'Property not found.' });
      return;
    }

    res.json({ data: property });
  }));

  router.get('/property-units', asyncHandler(async (req, res) => {
    const units = await listPropertyUnits({
      propertyId: req.query.propertyId,
      ...getPagination(req)
    });

    res.json({ data: units });
  }));

  router.get('/property-units/:id', asyncHandler(async (req, res) => {
    const unit = await getPropertyUnitById(req.params.id);

    if (!unit) {
      res.status(404).json({ error: 'Property unit not found.' });
      return;
    }

    res.json({ data: unit });
  }));

  router.get('/invoices', asyncHandler(async (req, res) => {
    const invoices = await listInvoices({
      propertyId: req.query.propertyId,
      renteeId: req.query.renteeId,
      status: req.query.status,
      billingPeriod: req.query.billingPeriod,
      fromDate: req.query.fromDate,
      toDate: req.query.toDate,
      ...getPagination(req)
    });

    res.json({ data: invoices });
  }));

  router.get('/invoices/:id', asyncHandler(async (req, res) => {
    const invoice = await getInvoiceById(req.params.id);

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found.' });
      return;
    }

    res.json({ data: invoice });
  }));

  router.post('/invoices', asyncHandler(async (req, res) => {
    const invoice = await createInvoice(req.body || {});
    res.status(201).json({ data: invoice });
  }));

  router.put('/invoices/:id', asyncHandler(async (req, res) => {
    const invoice = await updateInvoice(req.params.id, req.body || {});

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found.' });
      return;
    }

    res.json({ data: invoice });
  }));

  router.get('/agreement-templates', asyncHandler(async (req, res) => {
    const templates = await listAgreementTemplates({
      language: req.query.language,
      ...getPagination(req)
    });

    res.json({ data: templates });
  }));

  router.get('/agreement-templates/:id', asyncHandler(async (req, res) => {
    const template = await getAgreementTemplateById(req.params.id);

    if (!template) {
      res.status(404).json({ error: 'Agreement template not found.' });
      return;
    }

    res.json({ data: template });
  }));

  router.post('/agreement-templates', asyncHandler(async (req, res) => {
    const template = await createAgreementTemplate(req.body || {});
    res.status(201).json({ data: template });
  }));

  router.put('/agreement-templates/:id', asyncHandler(async (req, res) => {
    const template = await updateAgreementTemplate(req.params.id, req.body || {});

    if (!template) {
      res.status(404).json({ error: 'Agreement template not found.' });
      return;
    }

    res.json({ data: template });
  }));

  router.delete('/agreement-templates/:id', asyncHandler(async (req, res) => {
    const template = await deleteAgreementTemplateById(req.params.id);

    if (!template) {
      res.status(404).json({ error: 'Agreement template not found.' });
      return;
    }

    res.json({ data: template });
  }));

  router.get('/agreements', asyncHandler(async (req, res) => {
    const agreements = await listAgreements({
      propertyId: req.query.propertyId,
      renteeId: req.query.renteeId,
      status: req.query.status,
      ...getPagination(req)
    });

    res.json({ data: agreements });
  }));

  router.get('/agreements/:id', asyncHandler(async (req, res) => {
    const agreement = await getAgreementById(req.params.id);

    if (!agreement) {
      res.status(404).json({ error: 'Agreement not found.' });
      return;
    }

    res.json({ data: agreement });
  }));

  router.post('/agreements', asyncHandler(async (req, res) => {
    const agreement = await createAgreement(req.body || {});
    res.status(201).json({ data: agreement });
  }));

  router.put('/agreements/:id', asyncHandler(async (req, res) => {
    const agreement = await updateAgreement(req.params.id, req.body || {});

    if (!agreement) {
      res.status(404).json({ error: 'Agreement not found.' });
      return;
    }

    res.json({ data: agreement });
  }));

  router.post('/agreements/:id/sign', asyncHandler(async (req, res) => {
    const agreement = await markAgreementSigned(req.params.id);
    res.json({ data: agreement });
  }));

  router.delete('/agreements/:id', asyncHandler(async (req, res) => {
    const deletedAgreement = await deleteAgreementById(req.params.id);

    if (!deletedAgreement) {
      res.status(404).json({ error: 'Agreement not found.' });
      return;
    }

    res.json({ data: deletedAgreement });
  }));

  return router;
};
