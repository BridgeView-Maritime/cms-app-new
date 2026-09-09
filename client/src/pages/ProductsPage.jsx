// client/src/pages/ProductsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, ShoppingCart, Trash2, CheckCircle2, AlertTriangle, X, ClipboardList,
} from 'lucide-react';

import '../styles/theme.css';
import '../styles/landing.css';
import '../styles/candidatePortal.css';
import '../styles/products.css';
import { PRODUCT_ENDPOINTS, BACKEND_URL } from '../config/api';
import { useCandidateSession } from '../hooks/useCandidateSession';
import { useLandingContent } from '../hooks/useLandingContent';
import { useScrollableRoot } from '../hooks/useScrollableRoot';
import LandingHeader from '../components/LandingHeader';
import LandingFooter from '../components/LandingFooter';

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('candidateToken')}` });

function ProductImage({ image, title }) {
  const [failed, setFailed] = useState(!image);
  if (failed) {
    return (
      <div className="pp-image-fallback">
        <Package size={28} />
      </div>
    );
  }
  return (
    <img
      className="pp-image"
      src={`${BACKEND_URL}/uploads/products/${image}`}
      alt={title}
      onError={() => setFailed(true)}
    />
  );
}

function sizeOptions(product) {
  const chart = (product.size_chart || '').trim();
  if (chart) return chart.split(',').map((s) => s.trim()).filter(Boolean);
  return ['Free Size'];
}

export default function ProductsPage() {
  const navigate = useNavigate();
  const content = useLandingContent();
  const { candidate, loading: sessionLoading, logout: candidateLogout } = useCandidateSession();
  useScrollableRoot();

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selections, setSelections] = useState({}); // productId -> { size, quantity }

  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState('cart'); // 'cart' | 'orders'
  const [cartItems, setCartItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cartLoading, setCartLoading] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [notice, setNotice] = useState(null); // { type, text }

  useEffect(() => {
    fetch(PRODUCT_ENDPOINTS.LIST)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setProducts(d.products);
          const initial = {};
          d.products.forEach((p) => { initial[p.id] = { size: sizeOptions(p)[0], quantity: 1 }; });
          setSelections(initial);
        }
      })
      .catch(() => setNotice({ type: 'error', text: 'Could not load products.' }))
      .finally(() => setLoadingProducts(false));
  }, []);

  const goTo = useCallback((href) => (e) => {
    if (e) e.preventDefault();
    navigate(`/${href}`);
  }, [navigate]);

  const showNotice = (type, text) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  };

  const updateSelection = (productId, patch) => {
    setSelections((prev) => ({ ...prev, [productId]: { ...prev[productId], ...patch } }));
  };

  const loadCart = useCallback(async () => {
    setCartLoading(true);
    try {
      const res = await fetch(PRODUCT_ENDPOINTS.CART, { headers: authHeader() });
      const data = await res.json();
      if (data.success) setCartItems(data.items);
    } catch (err) {
      // silent — panel just stays on whatever it last had
    } finally {
      setCartLoading(false);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    setCartLoading(true);
    try {
      const res = await fetch(PRODUCT_ENDPOINTS.ORDERS, { headers: authHeader() });
      const data = await res.json();
      if (data.success) setOrders(data.orders);
    } catch (err) {
      // silent
    } finally {
      setCartLoading(false);
    }
  }, []);

  const openPanel = (tab) => {
    if (!candidate) {
      navigate('/candidate-login');
      return;
    }
    setPanelTab(tab);
    setPanelOpen(true);
    if (tab === 'cart') loadCart(); else loadOrders();
  };

  const handleAddToCart = async (product) => {
    if (!candidate) {
      navigate('/candidate-login');
      return;
    }
    const sel = selections[product.id] || { size: sizeOptions(product)[0], quantity: 1 };
    try {
      const res = await fetch(PRODUCT_ENDPOINTS.CART, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ product_id: product.id, size: sel.size, quantity: sel.quantity }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice('success', `${product.title} added to cart.`);
        setCartItems(data.items);
      } else {
        showNotice('error', data.message || 'Could not add to cart.');
      }
    } catch (err) {
      showNotice('error', 'Network error while adding to cart.');
    }
  };

  const handleRemoveCartItem = async (id) => {
    try {
      const res = await fetch(PRODUCT_ENDPOINTS.CART_ITEM(id), { method: 'DELETE', headers: authHeader() });
      const data = await res.json();
      if (data.success) setCartItems(data.items);
    } catch (err) {
      showNotice('error', 'Could not remove item.');
    }
  };

  const handleOrderNow = async () => {
    setOrdering(true);
    try {
      const res = await fetch(PRODUCT_ENDPOINTS.ORDER, { method: 'POST', headers: authHeader() });
      const data = await res.json();
      if (data.success) {
        setCartItems([]);
        showNotice('success', `Order placed (#${data.order_id}).`);
        setPanelTab('orders');
        loadOrders();
      } else {
        showNotice('error', data.message || 'Could not place order.');
      }
    } catch (err) {
      showNotice('error', 'Network error while placing your order.');
    } finally {
      setOrdering(false);
    }
  };

  return (
    <div className="lp-root">
      <LandingHeader topbar={content.topbar} onNavigate={goTo} scrolled candidate={candidate} onCandidateLogout={candidateLogout} />

      <section className="pp-hero">
        <span className="lp-kicker">Products</span>
        <h1>Maritime Gear &amp; Safety Equipment</h1>
        <p>Browse our range of workwear and safety equipment. Add items to your cart and place a request — no payment required online.</p>
        <button type="button" className="lp-btn lp-btn-primary pp-cart-btn" onClick={() => openPanel('cart')}>
          <ShoppingCart size={16} /> View Cart
        </button>
        <button type="button" className="lp-btn lp-btn-outline pp-cart-btn" onClick={() => openPanel('orders')}>
          <ClipboardList size={16} /> My Orders
        </button>
      </section>

      <section className="pp-grid-section">
        {loadingProducts ? (
          <p className="cp-muted">Loading products...</p>
        ) : (
          <div className="pp-grid">
            {products.map((product) => {
              const sel = selections[product.id] || { size: sizeOptions(product)[0], quantity: 1 };
              return (
                <div className="pp-card" key={product.id}>
                  <ProductImage image={product.image} title={product.title} />
                  <div className="pp-card-body">
                    <h3>{product.title}</h3>
                    <p className="pp-desc">{product.description}</p>
                    <div className="pp-meta">
                      {product.material && <span>{product.material}</span>}
                      <span className="pp-price">{product.price}</span>
                    </div>

                    <div className="pp-controls">
                      <select
                        value={sel.size}
                        onChange={(e) => updateSelection(product.id, { size: e.target.value })}
                        className="pp-size-select"
                      >
                        {sizeOptions(product).map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <input
                        type="number"
                        min={1}
                        value={sel.quantity}
                        onChange={(e) => updateSelection(product.id, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                        className="pp-qty-input"
                      />
                    </div>

                    <button type="button" className="lp-btn lp-btn-primary pp-add-btn" onClick={() => handleAddToCart(product)}>
                      <ShoppingCart size={15} /> Add to Cart
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <LandingFooter topbar={content.topbar} footer={content.footer} onNavigate={goTo} />

      {/* ---------------- CART / ORDERS PANEL ---------------- */}
      {panelOpen && (
        <div className="pp-panel-overlay" onClick={() => setPanelOpen(false)}>
          <div className="pp-panel" onClick={(e) => e.stopPropagation()}>
            <div className="pp-panel-head">
              <div className="pp-panel-tabs">
                <button type="button" className={panelTab === 'cart' ? 'pp-tab-active' : ''} onClick={() => { setPanelTab('cart'); loadCart(); }}>
                  Cart
                </button>
                <button type="button" className={panelTab === 'orders' ? 'pp-tab-active' : ''} onClick={() => { setPanelTab('orders'); loadOrders(); }}>
                  My Orders
                </button>
              </div>
              <button type="button" className="cp-icon-btn-sm" onClick={() => setPanelOpen(false)} aria-label="Close">
                <X size={14} />
              </button>
            </div>

            <div className="pp-panel-body">
              {cartLoading ? (
                <p className="cp-muted">Loading...</p>
              ) : panelTab === 'cart' ? (
                cartItems.length === 0 ? (
                  <p className="cp-muted">Your cart is empty.</p>
                ) : (
                  <>
                    {cartItems.map((item) => (
                      <div className="pp-cart-line" key={item._id}>
                        <ProductImage image={item.product?.image} title={item.product?.title} />
                        <div className="pp-cart-line-info">
                          <strong>{item.product?.title || 'Product'}</strong>
                          <span>Size: {item.size} &middot; Qty: {item.quantity}</span>
                        </div>
                        <button type="button" className="cp-icon-btn-sm" onClick={() => handleRemoveCartItem(item._id)} aria-label="Remove">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                    <button type="button" className="lp-btn lp-btn-primary pp-order-btn" onClick={handleOrderNow} disabled={ordering}>
                      {ordering ? 'Placing Order...' : 'Order Now'}
                    </button>
                  </>
                )
              ) : orders.length === 0 ? (
                <p className="cp-muted">No orders yet.</p>
              ) : (
                orders.map((order) => (
                  <div className="pp-order-group" key={order.order_id}>
                    <div className="pp-order-group-head">
                      <span>Order #{order.order_id}</span>
                      <span className="cp-muted">{new Date(order.cdate).toLocaleDateString()}</span>
                    </div>
                    {order.items.map((item) => (
                      <div className="pp-cart-line" key={item._id}>
                        <ProductImage image={item.product?.image} title={item.product?.title} />
                        <div className="pp-cart-line-info">
                          <strong>{item.product?.title || 'Product'}</strong>
                          <span>Size: {item.size} &middot; Qty: {item.quantity}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- TOAST ---------------- */}
      {notice && (
        <div className={`cp-alert cp-alert-${notice.type} pp-toast`}>
          {notice.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {notice.text}
        </div>
      )}
    </div>
  );
}
