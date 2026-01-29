document.addEventListener('DOMContentLoaded', function() {
    // Set current year in footer
    document.getElementById('currentYear').textContent = new Date().getFullYear();
    
    // State management
    let order = {};
    let activeCategory = '';
    let menuData = null;
    
    // DOM Elements
    const categoryTabs = document.getElementById('categoryTabs');
    const menuItemsContainer = document.getElementById('menuItems');
    const orderItemsContainer = document.getElementById('orderItems');
    const emptyOrderElement = document.getElementById('emptyOrder');
    const grandTotalElement = document.getElementById('grandTotal');
    const itemCountElement = document.getElementById('itemCount');
    const whatsappBtn = document.getElementById('whatsappBtn');
    const deliveryAddress = document.getElementById('deliveryAddress');
    const addressError = document.getElementById('addressError');
    const cafeNameElement = document.getElementById('cafeName');
    const clearOrderBtn = document.getElementById('clearOrderBtn');
    const clearOrderContainer = document.getElementById('clearOrderContainer');
    
    // Initialize the app
    async function init() {
        try {
            // Show loading state
            menuItemsContainer.innerHTML = `
                <div class="loading">
                    <div class="loading-spinner"></div>
                    <p>Loading menu...</p>
                </div>
            `;
            
            // Load menu data
            const response = await fetch('menu.json');
            
            if (!response.ok) {
                throw new Error(`Failed to load menu: ${response.status}`);
            }
            
            menuData = await response.json();
            
            // Update UI with cafe name
            cafeNameElement.textContent = menuData.cafeName || 'WhatsApp Cafe';
            
            // Generate category tabs
            generateCategoryTabs();
            
            // Generate initial menu items
            if (menuData.categories && menuData.categories.length > 0) {
                activeCategory = menuData.categories[0].name;
                renderMenuItems();
            } else {
                throw new Error('No categories found in menu data');
            }
            
            // Update order summary
            updateOrderSummary();
            
            // Setup event listeners
            setupEventListeners();
            
        } catch (error) {
            console.error('Error loading menu:', error);
            menuItemsContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load menu. Please check if menu.json file exists.</p>
                    <p style="font-size: 0.9rem;">${error.message}</p>
                </div>
            `;
        }
    }
    
    // Generate category tabs
    function generateCategoryTabs() {
        categoryTabs.innerHTML = '';
        
        if (!menuData.categories || menuData.categories.length === 0) {
            console.error('No categories available');
            return;
        }
        
        menuData.categories.forEach((category, index) => {
            const tab = document.createElement('button');
            tab.className = `category-tab ${index === 0 ? 'active' : ''}`;
            tab.textContent = category.name;
            tab.dataset.category = category.name;
            
            tab.addEventListener('click', () => {
                // Update active tab
                document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Filter menu items by category
                activeCategory = category.name;
                renderMenuItems();
            });
            
            categoryTabs.appendChild(tab);
        });
    }
    
    // Render menu items for current category
    function renderMenuItems() {
        menuItemsContainer.innerHTML = '';
        
        const currentCategory = menuData.categories.find(cat => cat.name === activeCategory);
        
        if (!currentCategory || !currentCategory.items || currentCategory.items.length === 0) {
            menuItemsContainer.innerHTML = `
                <div class="empty-order">
                    <i class="fas fa-utensils"></i>
                    <p>No items available in this category.</p>
                </div>
            `;
            return;
        }
        
        currentCategory.items.forEach(item => {
            const itemId = item.title.replace(/\s+/g, '-').toLowerCase();
            const quantity = order[itemId] || 0;
            
            const menuItem = document.createElement('div');
            menuItem.className = 'menu-item';
            menuItem.innerHTML = `
                <img src="${item.image}" alt="${item.title}" class="item-image" 
                     loading="lazy"
                     onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=400&h=300&fit=crop'">
                <div class="item-content">
                    <div class="item-title">
                        <span>${item.title}</span>
                        <span class="item-price">₹${item.price}</span>
                    </div>
                    <p class="item-description">${item.description}</p>
                    <div class="quantity-selector">
                        <button class="quantity-btn minus" data-item="${itemId}" aria-label="Decrease quantity">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="quantity-display" id="qty-${itemId}">${quantity}</span>
                        <button class="quantity-btn plus" data-item="${itemId}" aria-label="Increase quantity">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
            `;
            
            menuItemsContainer.appendChild(menuItem);
        });
        
        // Attach event listeners to quantity buttons
        attachQuantityListeners();
    }
    
    // Attach event listeners to quantity buttons
    function attachQuantityListeners() {
        document.querySelectorAll('.quantity-btn').forEach(button => {
            button.addEventListener('click', function(e) {
                e.stopPropagation();
                const itemId = this.dataset.item;
                const isPlus = this.classList.contains('plus');
                
                updateQuantity(itemId, isPlus);
                
                // Add visual feedback
                this.classList.add('order-update');
                setTimeout(() => {
                    this.classList.remove('order-update');
                }, 300);
            });
        });
    }
    
    // Update quantity for an item
    function updateQuantity(itemId, isPlus) {
        // Find the item in categories to get its details
        let itemDetails = null;
        
        menuData.categories.forEach(category => {
            if (category.items) {
                category.items.forEach(item => {
                    const id = item.title.replace(/\s+/g, '-').toLowerCase();
                    if (id === itemId) {
                        itemDetails = item;
                    }
                });
            }
        });
        
        if (!itemDetails) return;
        
        if (!order[itemId]) {
            order[itemId] = 0;
        }
        
        if (isPlus) {
            order[itemId]++;
        } else {
            if (order[itemId] > 0) {
                order[itemId]--;
                if (order[itemId] === 0) {
                    delete order[itemId];
                }
            }
        }
        
        // Update quantity display
        const qtyDisplay = document.getElementById(`qty-${itemId}`);
        if (qtyDisplay) {
            qtyDisplay.textContent = order[itemId] || 0;
            qtyDisplay.classList.add('order-update');
            setTimeout(() => {
                qtyDisplay.classList.remove('order-update');
            }, 300);
        }
        
        // Update order summary and validate form
        updateOrderSummary();
        validateForm();
    }
    
    // Remove an item completely from order
    function removeItem(itemId) {
        if (order[itemId]) {
            delete order[itemId];
            
            // Update quantity display in menu
            const qtyDisplay = document.getElementById(`qty-${itemId}`);
            if (qtyDisplay) {
                qtyDisplay.textContent = '0';
                qtyDisplay.classList.add('order-update');
                setTimeout(() => {
                    qtyDisplay.classList.remove('order-update');
                }, 300);
            }
            
            // Update order summary and validate form
            updateOrderSummary();
            validateForm();
            
            // Show confirmation toast
            showToast('Item removed from order', 'success');
        }
    }
    
    // Clear all items from order
    function clearAllItems() {
        if (Object.keys(order).length === 0) return;
        
        // Show confirmation dialog
        if (confirm('Are you sure you want to remove all items from your order?')) {
            // Reset all quantity displays
            Object.keys(order).forEach(itemId => {
                const qtyDisplay = document.getElementById(`qty-${itemId}`);
                if (qtyDisplay) {
                    qtyDisplay.textContent = '0';
                }
            });
            
            // Clear order object
            order = {};
            
            // Update order summary and validate form
            updateOrderSummary();
            validateForm();
            
            // Show confirmation toast
            showToast('All items removed from order', 'success');
        }
    }
    
    // Update order summary
    function updateOrderSummary() {
        // Clear current order items
        orderItemsContainer.innerHTML = '';
        
        let grandTotal = 0;
        let totalItems = 0;
        let hasItems = false;
        
        // Populate order items
        Object.keys(order).forEach(itemId => {
            const quantity = order[itemId];
            if (quantity === 0) return;
            
            // Find item details
            let itemDetails = null;
            
            menuData.categories.forEach(category => {
                if (category.items) {
                    category.items.forEach(item => {
                        const id = item.title.replace(/\s+/g, '-').toLowerCase();
                        if (id === itemId && quantity > 0) {
                            itemDetails = item;
                        }
                    });
                }
            });
            
            if (itemDetails) {
                const itemTotal = itemDetails.price * quantity;
                grandTotal += itemTotal;
                totalItems += quantity;
                hasItems = true;
                
                const orderItem = document.createElement('div');
                orderItem.className = 'order-item';
                orderItem.innerHTML = `
                    <div class="order-item-info">
                        <div class="order-item-name">${itemDetails.title}</div>
                        <div class="order-item-quantity">
                            <span>Qty: ${quantity}</span>
                            <span class="item-unit-price">(₹${itemDetails.price} each)</span>
                        </div>
                    </div>
                    <div class="order-item-actions">
                        <div class="order-item-price">₹${itemTotal}</div>
                        <button class="remove-item-btn" data-item="${itemId}" aria-label="Remove item">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
                
                orderItemsContainer.appendChild(orderItem);
            }
        });
        
        // Show/hide clear all button
        if (hasItems) {
            clearOrderContainer.style.display = 'block';
        } else {
            clearOrderContainer.style.display = 'none';
        }
        
        // Update item count
        itemCountElement.textContent = `${totalItems} ${totalItems === 1 ? 'item' : 'items'}`;
        
        // If no items, show empty state
        if (!hasItems) {
            const emptyOrderClone = emptyOrderElement.cloneNode(true);
            emptyOrderClone.id = '';
            orderItemsContainer.appendChild(emptyOrderClone);
        }
        
        // Update grand total with animation
        grandTotalElement.textContent = `₹${grandTotal}`;
        grandTotalElement.classList.add('order-update');
        setTimeout(() => {
            grandTotalElement.classList.remove('order-update');
        }, 300);
        
        // Attach event listeners to remove buttons
        attachRemoveListeners();
    }
    
    // Attach event listeners to remove buttons
    function attachRemoveListeners() {
        document.querySelectorAll('.remove-item-btn').forEach(button => {
            button.addEventListener('click', function(e) {
                e.stopPropagation();
                const itemId = this.dataset.item;
                removeItem(itemId);
            });
        });
    }
    
    // Setup event listeners
    function setupEventListeners() {
        // Address input validation
        deliveryAddress.addEventListener('input', validateForm);
        deliveryAddress.addEventListener('blur', validateAddress);
        
        // WhatsApp order button
        whatsappBtn.addEventListener('click', submitOrder);
        
        // Clear all items button
        clearOrderBtn.addEventListener('click', clearAllItems);
        
        // Initial validation
        validateForm();
    }
    
    // Validate address
    function validateAddress() {
        const address = deliveryAddress.value.trim();
        
        if (address.length < 10) {
            deliveryAddress.classList.add('error');
            addressError.classList.add('show');
            return false;
        } else {
            deliveryAddress.classList.remove('error');
            addressError.classList.remove('show');
            return true;
        }
    }
    
    // Validate form (address + at least one item)
    function validateForm() {
        const hasItems = Object.keys(order).some(itemId => order[itemId] > 0);
        const hasValidAddress = validateAddress();
        
        if (hasItems && hasValidAddress) {
            whatsappBtn.disabled = false;
            return true;
        } else {
            whatsappBtn.disabled = true;
            return false;
        }
    }
    
    // Submit order via WhatsApp
    function submitOrder() {
        if (!validateForm()) {
            if (!Object.keys(order).some(itemId => order[itemId] > 0)) {
                showToast('Please add at least one item to your order', 'error');
                return;
            }
            showToast('Please enter a valid delivery address', 'error');
            return;
        }
        
        // Get delivery address
        const address = deliveryAddress.value.trim();
        
        // Build order message
        let message = `Hello 👋\nI would like to order from ${menuData.cafeName}:\n\n`;
        
        let grandTotal = 0;
        let itemCount = 0;
        
        Object.keys(order).forEach(itemId => {
            const quantity = order[itemId];
            if (quantity === 0) return;
            
            // Find item details
            let itemDetails = null;
            
            menuData.categories.forEach(category => {
                if (category.items) {
                    category.items.forEach(item => {
                        const id = item.title.replace(/\s+/g, '-').toLowerCase();
                        if (id === itemId) {
                            itemDetails = item;
                        }
                    });
                }
            });
            
            if (itemDetails) {
                const itemTotal = itemDetails.price * quantity;
                grandTotal += itemTotal;
                itemCount++;
                
                message += `• ${itemDetails.title} x ${quantity} – ₹${itemTotal}\n`;
            }
        });
        
        message += `\n🛒 Total Items: ${itemCount}`;
        message += `\n💰 Total Amount: ₹${grandTotal}\n`;
        
        message += `\n📍 Delivery Address:\n${address}\n`;
        
        message += `\nPlease confirm my order. Thank you!`;
        
        // Encode message for URL
        const encodedMessage = encodeURIComponent(message);
        
        // Open WhatsApp with pre-filled message
        const whatsappURL = `https://wa.me/${menuData.whatsappNumber}?text=${encodedMessage}`;
        
        // Show success message
        showToast('Opening WhatsApp with your order details!', 'success');
        
        // Open WhatsApp after a short delay
        setTimeout(() => {
            window.open(whatsappURL, '_blank');
        }, 1000);
    }
    
    // Show toast notification
    function showToast(message, type = 'info') {
        // Remove existing toast
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        // Create new toast
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? 'check-circle' : 'exclamation-circle';
        
        toast.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        // Show toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Hide and remove toast after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }
    
    // Initialize the app
    init();
});