// Telegram Bot Integration for Food Ordering
class TelegramBotService {
    constructor() {
        this.BOT_TOKEN = '7679221384:AAFr0fAemfJLXaqCOR__VecpwNM1Yi8xqGs';
        this.CHAT_ID = '-1002442382353';
        this.TELEGRAM_API = `https://api.telegram.org/bot${this.BOT_TOKEN}`;
    }

    async sendMessage(text) {
        try {
            // Show immediate feedback
            this.showLocalNotification('Sending order to Telegram...', 'info');

            console.log('Sending message to Telegram:', {
                chat_id: this.CHAT_ID,
                text: text,
                parse_mode: 'Markdown'
            });

            // Direct API call
            const response = await fetch(`${this.TELEGRAM_API}/sendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: this.CHAT_ID,
                    text: text,
                    parse_mode: 'Markdown'
                })
            });

            const data = await response.json();
            console.log('Telegram API Response:', data);

            if (data.ok) {
                this.showLocalNotification('Order sent successfully!', 'success');
                return data;
            } else {
                throw new Error(data.description || 'Failed to send message');
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            this.showLocalNotification(`Error: ${error.message}`, 'error');
            throw error;
        }
    }

    showLocalNotification(message, type = 'success') {
        const toast = document.createElement('div');
        const backgroundColor = type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3';
        
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${backgroundColor};
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            font-family: 'Poppins', sans-serif;
            animation: slideIn 0.3s ease-out;
        `;
        
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    async sendOrder(orderDetails) {
        try {
            const message = `
🔔 *New Meal Order*

🍽 *Meal:* ${orderDetails.meal}
🏪 *Restaurant:* ${orderDetails.restaurant}
⏰ *Time Slot:* ${orderDetails.timeSlot}
💰 *Price:* ₹${orderDetails.price}

📅 *Order Date:* ${new Date().toLocaleDateString()}
⌚ *Order Time:* ${new Date().toLocaleTimeString()}`;

            // Save order to localStorage first
            const orders = JSON.parse(localStorage.getItem('orders') || '[]');
            const newOrder = {
                ...orderDetails,
                timestamp: new Date().toISOString(),
                status: 'pending'
            };
            orders.push(newOrder);
            localStorage.setItem('orders', JSON.stringify(orders));

            // Try to send to Telegram
            const result = await this.sendMessage(message);

            // Update order status
            newOrder.status = result.ok ? 'confirmed' : 'local_only';
            localStorage.setItem('orders', JSON.stringify(orders));

            // Update UI
            const orderButton = document.querySelector(`button[data-meal="${orderDetails.meal}"]`);
            if (orderButton) {
                orderButton.textContent = 'Ordered ✓';
                orderButton.disabled = true;
                orderButton.style.backgroundColor = '#4CAF50';
            }

            return result;
        } catch (error) {
            console.error('Order Error:', error);
            this.showLocalNotification('Order saved locally', 'error');
            return { ok: true, local: true };
        }
    }
}

// Create and export a single instance
export const telegramBot = new TelegramBotService();

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;

// Initialize notification system
document.addEventListener('DOMContentLoaded', () => {
    // Create notification container if it doesn't exist
    if (!document.getElementById('notification-container')) {
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 1000;
        `;
        document.body.appendChild(container);
    }
});
