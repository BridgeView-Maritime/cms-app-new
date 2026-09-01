import express from 'express';
import { Product } from '../models/Product.js';
import { ProductCart } from '../models/ProductCart.js';
import { ProductOrder } from '../models/ProductOrder.js';
import { authenticateCandidate } from '../middleware/candidateAuthMiddleware.js';
import { generateMysqlId } from '../utils/generateMysqlId.js';

const router = express.Router();

// Attaches product title/image/price/size_chart onto a list of cart or
// order line items (which only store product_id), for display.
const withProductDetails = async (lineItems) => {
  const productIds = [...new Set(lineItems.map((item) => item.product_id))];
  const products = await Product.find({ id: { $in: productIds } }).lean();
  const byId = new Map(products.map((p) => [p.id, p]));
  return lineItems.map((item) => ({
    ...item,
    product: byId.get(item.product_id) || null,
  }));
};

// ==========================================================================
// CATALOGUE — public, matches the old site's Products page.
// ==========================================================================
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({ status: 1 }).sort({ id: 1 }).lean();
    return res.status(200).json({ success: true, products });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================================================
// CART — candidate-only. A candidate's cart is every active
// (cart: 1) row matching their emailid.
// ==========================================================================
router.get('/cart', authenticateCandidate, async (req, res) => {
  try {
    const items = await ProductCart.find({ emailid: req.candidate.emailid, cart: 1 }).sort({ cdate: -1 }).lean();
    return res.status(200).json({ success: true, items: await withProductDetails(items) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/cart', authenticateCandidate, async (req, res) => {
  try {
    const { product_id, size, quantity } = req.body;
    const productId = Number(product_id);
    if (!productId) {
      return res.status(400).json({ success: false, message: 'A valid product is required.' });
    }

    const product = await Product.findOne({ id: productId, status: 1 });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const qty = String(Math.max(1, Number(quantity) || 1));

    // Same product + size already in the cart -> bump the quantity instead
    // of creating a duplicate line, matching normal cart behaviour.
    const existing = await ProductCart.findOne({ emailid: req.candidate.emailid, product_id: productId, size: size || '', cart: 1 });
    if (existing) {
      existing.quantity = String((Number(existing.quantity) || 1) + Number(qty));
      await existing.save();
    } else {
      await ProductCart.create({
        _mysqlId: generateMysqlId(),
        emailid: req.candidate.emailid,
        indosno: req.candidate.indosno || '',
        product_id: productId,
        size: size || '',
        quantity: qty,
        cart: 1,
      });
    }

    const items = await ProductCart.find({ emailid: req.candidate.emailid, cart: 1 }).sort({ cdate: -1 }).lean();
    return res.status(200).json({ success: true, message: 'Added to cart.', items: await withProductDetails(items) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/cart/:id', authenticateCandidate, async (req, res) => {
  try {
    await ProductCart.deleteOne({ _id: req.params.id, emailid: req.candidate.emailid });
    const items = await ProductCart.find({ emailid: req.candidate.emailid, cart: 1 }).sort({ cdate: -1 }).lean();
    return res.status(200).json({ success: true, items: await withProductDetails(items) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================================================
// ORDER — candidate-only. Converts every current cart line into an order
// line sharing one new order_id, then clears the cart. No payment step —
// this is a request record, not a transaction.
// ==========================================================================
router.post('/order', authenticateCandidate, async (req, res) => {
  try {
    const cartItems = await ProductCart.find({ emailid: req.candidate.emailid, cart: 1 }).lean();
    if (!cartItems.length) {
      return res.status(400).json({ success: false, message: 'Your cart is empty.' });
    }

    const orderId = Math.floor(Date.now() / 1000); // matches the legacy order_id convention
    const orderDocs = cartItems.map((item) => ({
      _mysqlId: generateMysqlId(),
      emailid: req.candidate.emailid,
      indosno: req.candidate.indosno || '',
      order_id: orderId,
      product_id: item.product_id,
      size: item.size,
      quantity: item.quantity,
      status: 1,
    }));

    await ProductOrder.insertMany(orderDocs);
    await ProductCart.deleteMany({ emailid: req.candidate.emailid, cart: 1 });

    const placedOrder = await withProductDetails(orderDocs);
    return res.status(200).json({ success: true, message: 'Order placed.', order_id: orderId, items: placedOrder });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/orders', authenticateCandidate, async (req, res) => {
  try {
    const orderLines = await ProductOrder.find({ emailid: req.candidate.emailid }).sort({ cdate: -1 }).lean();
    const withDetails = await withProductDetails(orderLines);

    const grouped = new Map();
    for (const line of withDetails) {
      if (!grouped.has(line.order_id)) {
        grouped.set(line.order_id, { order_id: line.order_id, cdate: line.cdate, items: [] });
      }
      grouped.get(line.order_id).items.push(line);
    }

    return res.status(200).json({ success: true, orders: [...grouped.values()] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
