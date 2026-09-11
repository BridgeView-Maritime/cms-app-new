// client/src/pages/candidate/CandidatePpePage.jsx
// Legacy PPE_details1.php: the candidate records their size for each item
// of kit; the company's order history for them is shown underneath.
import React, { useState, useEffect } from 'react';
import { HardHat, PackageCheck, Inbox, Info } from 'lucide-react';
import { ACCOUNT_ENDPOINTS } from '../../config/api';
import CandidateCrudSection from '../../components/candidate/CandidateCrudSection';

const authHeader = () => ({ Authorization: 'Bearer ' + localStorage.getItem('candidateToken') });

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime()) || d.getFullYear() < 1902) return '';
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function CandidatePpePage() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    fetch(ACCOUNT_ENDPOINTS.PPE_OPTIONS)
      .then((r) => r.json())
      .then((d) => { if (d.success) setProducts(d.products || []); })
      .catch(() => {});
    fetch(ACCOUNT_ENDPOINTS.PPE_ORDERS, { headers: authHeader() })
      .then((r) => r.json())
      .then((d) => setOrders(d.success ? d.records : []))
      .catch(() => setOrders([]));
  }, []);

  const sizesFor = (draft) => {
    const p = products.find((x) => x.name === draft?.product_name);
    return p ? p.sizes : [];
  };

  return (
    <>
      <div className="cp-page-head">
        <div>
          <h1>PPE Details</h1>
          <p>Your sizes for protective equipment and uniform, so the right kit is ready when you join.</p>
        </div>
      </div>

      <div className="cp-section-heading">
        <HardHat size={17} />
        <h2>My Sizes</h2>
      </div>
      <CandidateCrudSection
        endpoint={ACCOUNT_ENDPOINTS.PPE}
        addLabel="Add Size"
        emptyText="Add your size for each item - shirt, trousers, shoes, helmet and so on."
        columns={['product_name', 'product_size']}
        fields={[
          { key: 'product_name', label: 'Item', type: 'select', required: true, options: products.map((p) => p.name) },
          {
            key: 'product_size', label: 'Size', required: true,
            // Free-size items have no sizes to choose from.
            type: 'select',
            options: (draft) => {
              const s = sizesFor(draft);
              return s.length ? s : ['Free Size'];
            },
          },
        ]}
      />

      <div className="cp-section-heading cp-section-heading-spaced">
        <PackageCheck size={17} />
        <h2>Previous Orders</h2>
      </div>
      {orders === null ? (
        <div className="cp-loading-screen">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="cp-placeholder">
          <Inbox size={28} />
          <h2>No orders yet</h2>
          <p>Kit ordered for you by the company will be listed here.</p>
        </div>
      ) : (
        <div className="cp-card cp-table-card">
          <div className="cp-table-scroll">
            <table className="cp-table">
              <thead>
                <tr><th>Item</th><th>Size</th><th>Qty</th><th>Vessel</th><th>Status</th><th>Date</th></tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o._id}>
                    <td>{o.product || <span className="cp-muted">&mdash;</span>}</td>
                    <td>{o.size || <span className="cp-muted">&mdash;</span>}</td>
                    <td>{o.quantity || <span className="cp-muted">&mdash;</span>}</td>
                    <td>{o.vessel || <span className="cp-muted">&mdash;</span>}</td>
                    <td>{o.status || <span className="cp-muted">&mdash;</span>}</td>
                    <td>{formatDate(o.date) || <span className="cp-muted">&mdash;</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="cp-table-note">
            <Info size={13} /> Orders are placed by the company against your recorded sizes.
          </p>
        </div>
      )}
    </>
  );
}
