import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { INVOICE_STATUS } from '../../utils/constants';
import { findAppUserByAuthId } from '../../services/appUserService';
import { listProperties } from '../../services/agreementService';
import { listInvoices } from '../../services/invoiceService';

// Components
import InvoiceCard from '../../components/invoices/InvoiceCard';
import PaymentProofUpload from '../../components/invoices/PaymentProofUpload';

const RenteeInvoices = () => {
  const { user, activeTenantId } = useAuth();
  
  // State
  const [invoices, setInvoices] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPaymentUpload, setShowPaymentUpload] = useState(false);
  const dataFetched = useRef(false);
  
  // Fetch rentee's invoices
  useEffect(() => {
    dataFetched.current = false;
    setInvoices([]);
    setProperties([]);
    setError(null);

    // Skip if data has already been fetched or user is not available
    if (dataFetched.current || !user || !user.id) {
      return;
    }
    
    const fetchRenteeInvoices = async () => {
      try {
        setLoading(true);
        
        // First, fetch the rentee profile from app_users table to get the renteeId
        const renteeResult = await findAppUserByAuthId(user.id);

        if (!renteeResult.success) {
          throw new Error(renteeResult.error || 'No rentee profile found for your account. Please contact support.');
        }

        const renteeData = renteeResult.data;
        
        if (!renteeData) {
          throw new Error('No rentee profile found for your account. Please contact support.');
        }
        
        const renteeId = renteeData.id;
        
        // Fetch invoices for the current rentee
        const { data: invoicesData, error: invoicesError } = await listInvoices({
          renteeId,
          pageSize: 1000
        });
        
        if (invoicesError) {
          throw invoicesError;
        }
        
        setInvoices(invoicesData || []);
        
        // Fetch properties for the invoices
        if (invoicesData && invoicesData.length > 0) {
          const propertyIds = new Set(invoicesData.map(invoice => invoice.propertyid));
          const propertyData = await listProperties();
          setProperties((propertyData || []).filter((property) => propertyIds.has(property.id)));
        }
        
        // Mark data as fetched
        dataFetched.current = true;
      } catch (error) {
        console.error('Error fetching rentee invoices:', error.message);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRenteeInvoices();
  }, [user?.id, activeTenantId]);
  
  // Filter invoices based on search term and status filter
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.id.toString().includes(searchTerm.toLowerCase()) ||
      invoice.billingperiod.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (properties.find(p => p.id === invoice.propertyid)?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  // Handle payment upload success
  const handlePaymentUploadSuccess = (updatedInvoice) => {
    setInvoices(prevInvoices => 
      prevInvoices.map(invoice => 
        invoice.id === updatedInvoice.id ? updatedInvoice : invoice
      )
    );
    setShowPaymentUpload(false);
    setSelectedInvoice(null);
  };
  
  // Handle payment upload error
  const handlePaymentUploadError = (errorMessage) => {
    setError(errorMessage);
  };
  
  // Handle record payment click
  const handleRecordPayment = (invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentUpload(true);
  };
  
  // Render loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading your invoices...</div>
      </div>
    );
  }
  
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">My Invoices</h1>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}
      
      {/* Search and filter */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <label htmlFor="statusFilter" className="text-sm font-medium text-gray-700">
              Status:
            </label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All</option>
              <option value={INVOICE_STATUS.PENDING}>Pending</option>
              <option value={INVOICE_STATUS.VERIFICATION_PENDING}>Verification Pending</option>
              <option value={INVOICE_STATUS.PAID}>Paid</option>
              <option value={INVOICE_STATUS.OVERDUE}>Overdue</option>
              <option value={INVOICE_STATUS.REJECTED}>Rejected</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Invoices list */}
      {filteredInvoices.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-600">No invoices found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredInvoices.map(invoice => {
            const property = properties.find(p => p.id === invoice.propertyid);
            
            return (
              <div key={invoice.id} className="relative">
                <InvoiceCard
                  invoice={invoice}
                  property={property}
                  rentee={user}
                />
                
                {/* Action buttons for specific statuses */}
                {(invoice.status === INVOICE_STATUS.PENDING || invoice.status === INVOICE_STATUS.OVERDUE) && (
                  <div className="absolute top-4 right-4">
                    <button
                      onClick={() => handleRecordPayment(invoice)}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                    >
                      Record Payment
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {/* Payment Upload Modal */}
      {showPaymentUpload && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Upload Payment Proof</h2>
            <p className="mb-4">
              Invoice #{selectedInvoice.id} - {formatCurrency(selectedInvoice.totalamount || selectedInvoice.totalAmount || 0)}
            </p>
            
            <PaymentProofUpload
              invoiceId={selectedInvoice.id}
              onSuccess={handlePaymentUploadSuccess}
              onError={handlePaymentUploadError}
            />
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setShowPaymentUpload(false);
                  setSelectedInvoice(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RenteeInvoices; 