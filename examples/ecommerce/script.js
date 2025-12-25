/**
 * E-commerce Demo with athreei SDK
 *
 * This example demonstrates how to integrate the athreei SDK into an e-commerce website.
 * It shows how to register custom tools that AI assistants can use to help users shop.
 *
 * The demo uses mock mode, so it works without the athreei extension installed.
 */

// Import the athreei SDK
// In production, you would install via npm: npm install @athreei/sdk
// For this demo, we import from the local build
import { athreei, enableMockMode } from '../../packages/sdk/dist/index.js'

// ============================================================================
// PRODUCT DATA
// ============================================================================

const PRODUCTS = [
  {
    id: 'p1',
    name: 'Wireless Headphones',
    category: 'electronics',
    price: 79.99,
    icon: '🎧',
    description: 'Premium noise-canceling wireless headphones'
  },
  {
    id: 'p2',
    name: 'Smart Watch',
    category: 'electronics',
    price: 199.99,
    icon: '⌚',
    description: 'Fitness tracking smartwatch with heart rate monitor'
  },
  {
    id: 'p3',
    name: 'Laptop Stand',
    category: 'electronics',
    price: 34.99,
    icon: '💻',
    description: 'Ergonomic aluminum laptop stand'
  },
  {
    id: 'p4',
    name: 'The Great Gatsby',
    category: 'books',
    price: 12.99,
    icon: '📚',
    description: 'Classic American novel by F. Scott Fitzgerald'
  },
  {
    id: 'p5',
    name: 'Clean Code',
    category: 'books',
    price: 42.99,
    icon: '📖',
    description: 'A handbook of agile software craftsmanship'
  },
  {
    id: 'p6',
    name: 'Coffee Maker',
    category: 'home',
    price: 89.99,
    icon: '☕',
    description: 'Programmable coffee maker with thermal carafe'
  },
  {
    id: 'p7',
    name: 'Air Fryer',
    category: 'home',
    price: 119.99,
    icon: '🍳',
    description: 'Digital air fryer with 8 cooking presets'
  },
  {
    id: 'p8',
    name: 'Yoga Mat',
    category: 'sports',
    price: 24.99,
    icon: '🧘',
    description: 'Non-slip exercise yoga mat with carrying strap'
  },
  {
    id: 'p9',
    name: 'Dumbbells Set',
    category: 'sports',
    price: 89.99,
    icon: '🏋️',
    description: 'Adjustable dumbbell set (5-25 lbs)'
  },
  {
    id: 'p10',
    name: 'Running Shoes',
    category: 'sports',
    price: 129.99,
    icon: '👟',
    description: 'Lightweight running shoes with cushioned sole'
  }
]

// ============================================================================
// CART STATE
// ============================================================================

let cart = [] // Array of { productId, quantity }

function getCart() {
  return cart.map(item => {
    const product = PRODUCTS.find(p => p.id === item.productId)
    return {
      ...item,
      product,
      subtotal: product.price * item.quantity
    }
  })
}

function getCartTotal() {
  return getCart().reduce((sum, item) => sum + item.subtotal, 0)
}

function addToCart(productId, quantity = 1) {
  const product = PRODUCTS.find(p => p.id === productId)
  if (!product) {
    throw new Error(`Product ${productId} not found`)
  }

  const existingItem = cart.find(item => item.productId === productId)
  if (existingItem) {
    existingItem.quantity += quantity
  } else {
    cart.push({ productId, quantity })
  }

  updateCartUI()
  logAIActivity(`Added ${quantity}x ${product.name} to cart`)
  return { success: true, cartCount: cart.length }
}

function updateCartItemQuantity(productId, quantity) {
  const item = cart.find(item => item.productId === productId)
  if (item) {
    if (quantity <= 0) {
      cart = cart.filter(item => item.productId !== productId)
    } else {
      item.quantity = quantity
    }
    updateCartUI()
  }
}

function clearCart() {
  cart = []
  updateCartUI()
}

// ============================================================================
// UI FUNCTIONS
// ============================================================================

function renderProducts(filter = 'all', searchQuery = '') {
  const grid = document.getElementById('productsGrid')

  let filtered = PRODUCTS

  // Apply category filter
  if (filter !== 'all') {
    filtered = filtered.filter(p => p.category === filter)
  }

  // Apply search filter
  if (searchQuery) {
    const query = searchQuery.toLowerCase()
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query)
    )
  }

  grid.innerHTML = filtered.map(product => `
    <div class="product-card">
      <div class="product-image">${product.icon}</div>
      <div class="product-info">
        <div class="product-name">${product.name}</div>
        <div class="product-category">${product.category}</div>
        <div class="product-price">$${product.price.toFixed(2)}</div>
        <button class="add-to-cart-btn" onclick="window.addProductToCart('${product.id}')">
          Add to Cart
        </button>
      </div>
    </div>
  `).join('')
}

function updateCartUI() {
  const cartContent = document.getElementById('cartContent')
  const cartCount = document.getElementById('cartCount')

  const items = getCart()
  cartCount.textContent = items.reduce((sum, item) => sum + item.quantity, 0)

  if (items.length === 0) {
    cartContent.innerHTML = '<div class="cart-empty">Your cart is empty</div>'
    return
  }

  const total = getCartTotal()

  cartContent.innerHTML = `
    <div class="cart-items">
      ${items.map(item => `
        <div class="cart-item">
          <div class="cart-item-info">
            <div class="cart-item-name">${item.product.name}</div>
            <div class="cart-item-price">$${item.product.price.toFixed(2)} each</div>
          </div>
          <div class="cart-item-quantity">
            <button class="quantity-btn" onclick="window.updateQuantity('${item.productId}', ${item.quantity - 1})">-</button>
            <span>${item.quantity}</span>
            <button class="quantity-btn" onclick="window.updateQuantity('${item.productId}', ${item.quantity + 1})">+</button>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="cart-total">
      <span>Total:</span>
      <span>$${total.toFixed(2)}</span>
    </div>
    <button class="checkout-btn" onclick="window.performCheckout()">
      Checkout
    </button>
  `
}

function logAIActivity(message) {
  const logs = document.getElementById('aiLogs')
  const time = new Date().toLocaleTimeString()

  const entry = document.createElement('div')
  entry.className = 'ai-log-entry'
  entry.innerHTML = `
    <div class="ai-log-time">${time}</div>
    <div class="ai-log-message">${message}</div>
  `

  // Remove placeholder if present
  if (logs.querySelector('div[style*="text-align: center"]')) {
    logs.innerHTML = ''
  }

  logs.insertBefore(entry, logs.firstChild)

  // Keep only last 10 entries
  while (logs.children.length > 10) {
    logs.removeChild(logs.lastChild)
  }
}

function updateAIStatus(status, text) {
  const badge = document.getElementById('aiStatusBadge')
  const statusText = document.getElementById('aiStatusText')

  badge.className = `status-badge status-${status}`

  if (status === 'ready') {
    badge.textContent = 'AI Ready'
  } else {
    badge.textContent = 'Waiting...'
  }

  if (text) {
    statusText.textContent = text
  }
}

// ============================================================================
// WINDOW FUNCTIONS (for onclick handlers)
// ============================================================================

window.addProductToCart = (productId) => {
  addToCart(productId, 1)
}

window.updateQuantity = (productId, quantity) => {
  updateCartItemQuantity(productId, quantity)
}

window.performCheckout = () => {
  const total = getCartTotal()
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  logAIActivity(`Checkout initiated: ${itemCount} items, total $${total.toFixed(2)}`)

  // Simulate checkout
  const cartContent = document.getElementById('cartContent')
  cartContent.innerHTML = `
    <div class="success-message">
      Order placed successfully!<br>
      Order ID: #${Math.random().toString(36).substr(2, 9).toUpperCase()}
    </div>
  `

  setTimeout(() => {
    clearCart()
  }, 3000)
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

let currentCategory = 'all'
let currentSearch = ''

// Category filter
document.querySelectorAll('.category-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    currentCategory = btn.dataset.category
    renderProducts(currentCategory, currentSearch)
  })
})

// Search
document.getElementById('searchInput').addEventListener('input', (e) => {
  currentSearch = e.target.value
  renderProducts(currentCategory, currentSearch)
})

// ============================================================================
// ATHREEI SDK INTEGRATION
// ============================================================================

/**
 * Step 1: Enable mock mode for testing
 *
 * Mock mode allows you to test the athreei integration without having the
 * extension installed. It simulates the extension's behavior and will
 * automatically trigger some AI actions to demonstrate the functionality.
 */
enableMockMode({
  simulateDelay: 1000, // Wait 1 second before extension "connects"

  // Auto-trigger some AI actions to demonstrate the tools
  autoTriggerTools: [
    {
      tool: 'search_products',
      args: { query: 'headphones' },
      delay: 2000 // Trigger 2 seconds after ready
    },
    {
      tool: 'add_to_cart',
      args: { productId: 'p1', quantity: 1 },
      delay: 4000 // Trigger 4 seconds after ready
    },
    {
      tool: 'get_cart',
      args: {},
      delay: 5000 // Trigger 5 seconds after ready
    }
  ]
})

/**
 * Step 2: Wait for the extension to be ready
 *
 * The onReady callback is called when the athreei extension connects
 * (or immediately in mock mode). This is where you should initialize
 * your AI integration.
 */
athreei.onReady((info) => {
  console.log('athreei ready:', info)
  updateAIStatus('ready', `Connected to athreei v${info.version}`)
  logAIActivity('AI Assistant connected and ready')
})

/**
 * Step 3: Register custom tools
 *
 * Tools are functions that AI assistants can call to interact with your website.
 * Each tool should have a clear name, description, and parameter definitions.
 */

// Tool 1: Search for products
athreei.registerTool({
  name: 'search_products',
  description: 'Search for products in the catalog by name, description, or category',
  parameters: {
    query: {
      type: 'string',
      required: true,
      description: 'Search query to find products'
    },
    category: {
      type: 'string',
      required: false,
      description: 'Filter by category (electronics, books, home, sports)',
      enum: ['electronics', 'books', 'home', 'sports']
    },
    maxResults: {
      type: 'number',
      required: false,
      default: 10,
      description: 'Maximum number of results to return'
    }
  },
  // The handler function is called when the AI uses this tool
  handler: async ({ query, category, maxResults = 10 }) => {
    logAIActivity(`Searching for: "${query}"${category ? ` in ${category}` : ''}`)

    let results = PRODUCTS

    // Filter by category if provided
    if (category) {
      results = results.filter(p => p.category === category)
    }

    // Search by query
    const searchLower = query.toLowerCase()
    results = results.filter(p =>
      p.name.toLowerCase().includes(searchLower) ||
      p.description.toLowerCase().includes(searchLower) ||
      p.category.toLowerCase().includes(searchLower)
    )

    // Limit results
    results = results.slice(0, maxResults)

    logAIActivity(`Found ${results.length} products`)

    // Return results to the AI
    return {
      products: results.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        description: p.description
      })),
      count: results.length
    }
  }
})

// Tool 2: Add item to cart
athreei.registerTool({
  name: 'add_to_cart',
  description: 'Add a product to the shopping cart',
  parameters: {
    productId: {
      type: 'string',
      required: true,
      description: 'The ID of the product to add'
    },
    quantity: {
      type: 'number',
      required: false,
      default: 1,
      description: 'Quantity to add (default: 1)'
    }
  },
  handler: async ({ productId, quantity = 1 }) => {
    try {
      const result = addToCart(productId, quantity)
      const product = PRODUCTS.find(p => p.id === productId)

      return {
        success: true,
        message: `Added ${quantity}x ${product.name} to cart`,
        cartCount: result.cartCount,
        cartTotal: getCartTotal()
      }
    } catch (error) {
      logAIActivity(`Error: ${error.message}`)
      return {
        success: false,
        error: error.message
      }
    }
  }
})

// Tool 3: Get cart contents
athreei.registerTool({
  name: 'get_cart',
  description: 'Get the current shopping cart contents and total',
  parameters: {},
  handler: async () => {
    const items = getCart()
    const total = getCartTotal()

    logAIActivity(`Retrieved cart: ${items.length} items, $${total.toFixed(2)} total`)

    return {
      items: items.map(item => ({
        productId: item.productId,
        productName: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        subtotal: item.subtotal
      })),
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      total: total
    }
  }
})

// Tool 4: Checkout
athreei.registerTool({
  name: 'checkout',
  description: 'Complete the purchase and checkout',
  parameters: {},
  handler: async () => {
    if (cart.length === 0) {
      logAIActivity('Checkout failed: Cart is empty')
      return {
        success: false,
        error: 'Cart is empty'
      }
    }

    const total = getCartTotal()
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)
    const orderId = Math.random().toString(36).substr(2, 9).toUpperCase()

    logAIActivity(`Processing checkout: ${itemCount} items, $${total.toFixed(2)}`)

    // Simulate checkout
    const cartContent = document.getElementById('cartContent')
    cartContent.innerHTML = `
      <div class="success-message">
        Order placed successfully!<br>
        Order ID: #${orderId}
      </div>
    `

    const items = [...cart] // Save for response

    setTimeout(() => {
      clearCart()
    }, 3000)

    return {
      success: true,
      orderId: orderId,
      total: total,
      itemCount: itemCount,
      message: 'Order placed successfully'
    }
  }
})

/**
 * Step 4: Listen for AI actions (optional)
 *
 * You can use onBeforeAction and onAfterAction to track when the AI
 * uses your tools. This is useful for analytics, logging, or showing
 * visual feedback to users.
 */
athreei.onBeforeAction((action) => {
  console.log('AI action starting:', action)
  logAIActivity(`AI calling: ${action.tool}`)
})

athreei.onAfterAction((action) => {
  console.log('AI action completed:', action)
  if (action.success) {
    logAIActivity(`AI action completed: ${action.tool}`)
  } else {
    logAIActivity(`AI action failed: ${action.error}`)
  }
})

// ============================================================================
// INITIALIZE THE PAGE
// ============================================================================

// Render initial products
renderProducts()

// Initial cart state
updateCartUI()

console.log('E-commerce demo initialized')
console.log('Try asking your AI assistant to:')
console.log('- Search for products: "Find me some headphones"')
console.log('- Add items to cart: "Add the wireless headphones to my cart"')
console.log('- Check cart: "What\'s in my shopping cart?"')
console.log('- Checkout: "Checkout my cart"')
