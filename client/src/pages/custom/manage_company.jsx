import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, FileText, Download, FileSpreadsheet, RefreshCw, AlertCircle, 
  Search, ChevronLeft, ChevronRight, Briefcase, Edit, Trash2, ExternalLink 
} from 'lucide-react';
import { AUTH_ENDPOINTS } from '../../config/api';
import '../../styles/custom/manage_company.css';

export default function ManageCompanyCustomPage() {
  const navigate = useNavigate();

  // Primary Workspace States
  const [metaConfig, setMetaConfig] = useState(null);
  const [listData, setListData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Data Table & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const FORM_CODE = 'MANAGE_COMPANY';

  useEffect(() => {
    fetchMetadataAndRecords();
  }, []);

  const fetchMetadataAndRecords = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken');
      const headers = { 'Authorization': `Bearer ${token}` };

      // 1. Fetch MANAGE_COMPANY Schema Configuration
      const metaRes = await fetch(`${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/admin/metadata/form/${FORM_CODE}`, { headers });
      const metaJson = await metaRes.json();

      if (!metaRes.ok) throw new Error(metaJson.message || 'Failed to fetch layout metadata.');
      setMetaConfig(metaJson);

      // 2. Resolve sourceFormCode and fetch collection records
      const sourceFormCode = metaJson.listing_config?.sourceFormCode || 'CREATE_COMPANY';
      const recordsUrl = `${AUTH_ENDPOINTS.REACT_APP_API_URL}/api/collections/${sourceFormCode.toLowerCase()}/all`;
      
      const recordsRes = await fetch(recordsUrl, { headers });
      const recordsJson = await recordsRes.json();

      if (recordsRes.ok) {
        // Support array payloads or structured response envelopes ({ success: true, data: [...] })
        const fetchedRecords = Array.isArray(recordsJson) 
          ? recordsJson 
          : (recordsJson.data || recordsJson.records || []);
        setListData(fetchedRecords);
      } else {
        throw new Error(recordsJson.message || 'Failed to retrieve listing records.');
      }

    } catch (err) {
      console.error('Data Fetch Error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Export Data to CSV
  const handleExportCSV = () => {
    if (!listData.length || !columns.length) return;
    const headers = columns.join(',');
    const rows = filteredData.map(row => 
      columns.map(col => `"${String(row[col] ?? '').replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${metaConfig?.listing_config?.sourceFormCode || 'export'}_records.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Safe Configuration Extracts
  const listingConfig = metaConfig?.listing_config || {};
  const columns = listingConfig.selectedColumns || [];
  const redirectButtons = listingConfig.redirectButtons || [];
  const rowActionsConfig = listingConfig.rowActionsConfig || {};

  // Filtering Logic
  const filteredData = listData.filter(row => {
    if (!searchTerm.trim()) return true;
    return columns.some(col => {
      const val = row[col];
      return val !== undefined && val !== null && String(val).toLowerCase().includes(searchTerm.toLowerCase());
    });
  });

  // Pagination Logic
  const totalRecords = filteredData.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

  return (
    <div className="manage-company-container">
      <div className="manage-company-card">
        
        {/* Workspace Top Header Bar */}
        <div className="manage-company-header">
          <div className="title-area">
            <Briefcase size={22} className="header-icon" />
            <div>
              <h2>{metaConfig?.form_name || 'Manage Company Management Interface Matrix'}</h2>
              <span className="subtitle-code">Form Code: {metaConfig?.form_code || FORM_CODE}</span>
            </div>
          </div>

          {/* Dynamic Top Redirect Actions */}
          <div className="header-actions">
            {redirectButtons.map(btn => (
              <button
                key={btn.id || btn.order}
                onClick={() => navigate(btn.href.startsWith('/') ? btn.href : `/app/workspace/${btn.href}`)}
                className="btn-primary-action"
              >
                <Plus size={16} />
                <span>{btn.label}</span>
              </button>
            ))}
            <button onClick={fetchMetadataAndRecords} className="btn-icon-secondary" title="Refresh Table">
              <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
            </button>
          </div>
        </div>

        {/* Toolbar: Search & File Export Utility Options */}
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search across columns..." 
              value={searchTerm} 
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>

          <div className="export-actions">
            {listingConfig.allowExcelExport && (
              <button onClick={handleExportCSV} className="btn-export-utility" title="Export CSV Data">
                <FileSpreadsheet size={15} /> Export Excel/CSV
              </button>
            )}
            {listingConfig.allowPdfExport && (
              <button onClick={() => window.print()} className="btn-export-utility" title="Print View">
                <FileText size={15} /> Print/PDF
              </button>
            )}
          </div>
        </div>

        {/* Status Messaging Display */}
        {error && (
          <div className="status-alert alert-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Dual Axis Scrollable DataTable Container */}
        <div className="datatable-scroll-viewport">
          <table className="custom-datatable">
            <thead>
              <tr>
                <th className="sticky-col-header">#</th>
                {columns.map(col => (
                  <th key={col}>{col.replace(/_/g, ' ')}</th>
                ))}
                {rowActionsConfig.enableActionColumn && (
                  <th className="sticky-col-header-right">Actions</th>
                )}
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length + 2} className="table-state-cell">
                    <RefreshCw size={20} className="spin" />
                    <span>Loading company records from source context...</span>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 2} className="table-state-cell">
                    <span>No data available in this collection repository.</span>
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, idx) => (
                  <tr key={row._id || idx}>
                    <td className="sticky-col-cell row-index">{startIndex + idx + 1}</td>
                    
                    {/* Render Column Fields */}
                    {columns.map(col => (
                      <td key={col}>
                        {row[col] !== undefined && row[col] !== null 
                          ? String(row[col]) 
                          : <span className="null-cell-indicator">—</span>}
                      </td>
                    ))}

                    {/* Inline Row Actions Grid */}
                    {rowActionsConfig.enableActionColumn && (
                      <td className="sticky-col-cell-right action-buttons-cell">
                        {rowActionsConfig.allowEdit && (
                          <button className="row-action-btn edit" title="Edit Entry">
                            <Edit size={14} />
                          </button>
                        )}
                        {rowActionsConfig.allowDelete && (
                          <button className="row-action-btn delete" title="Delete Record">
                            <Trash2 size={14} />
                          </button>
                        )}
                        {rowActionsConfig.allowInlineAdd && rowActionsConfig.inlineAddFormCode && (
                          <button 
                            className="row-action-btn inline-add" 
                            title={`Create ${rowActionsConfig.inlineAddFormCode}`}
                            onClick={() => navigate(`/app/workspace/${rowActionsConfig.inlineAddFormCode}`)}
                          >
                            <ExternalLink size={14} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* DataTable Footer Pagination controls */}
        <div className="table-footer-pagination">
          <div className="page-size-selector">
            <span>Show</span>
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>entries | Total Records: <strong>{totalRecords}</strong></span>
          </div>

          <div className="pagination-controls">
            <button 
              disabled={currentPage === 1} 
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              className="btn-pagination"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="page-indicator">
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
            </span>
            <button 
              disabled={currentPage === totalPages || totalPages === 0} 
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              className="btn-pagination"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}



