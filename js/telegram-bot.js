// Telegram Bot Integration for Food Ordering
class TelegramBotService {
    constructor() {
        this.BOT_TOKEN = '7679221384:AAFr0fAemfJLXaqCOR__VecpwNM1Yi8xqGs';
        this.CHAT_ID = '-4514267620';
        this.TELEGRAM_API = `https://api.telegram.org/bot${this.BOT_TOKEN}`;
    }

    async initializeBot() {
        try {
            // Set bot commands
            await this.setBotCommands();
            console.log('Bot initialized successfully');
        } catch (error) {
            console.error('Error initializing bot:', error);
        }
    }

    async setBotCommands() {
        try {
            const commands = [
                { command: 'start', description: 'Start the bot' },
                { command: 'help', description: 'Show help information' },
                { command: 'order', description: 'Place a new food order' },
                { command: 'status', description: 'Check your order status' },
                { command: 'nutrition', description: 'View your nutrition summary' }
            ];

            const response = await fetch(`${this.TELEGRAM_API}/setMyCommands`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ commands })
            });

            const result = await response.json();
            if (!result.ok) {
                throw new Error('Failed to set bot commands');
            }
        } catch (error) {
            console.error('Error setting bot commands:', error);
            throw error;
        }
    }

    async handleCommand(command, chatId) {
        switch (command) {
            case '/start':
                await this.sendMessage(chatId, `
🎉 Welcome to MuscleMate Food Ordering!

I'm your personal nutrition assistant. I'll help you:
- Order healthy meals based on your nutrition goals
- Track your weekly nutrition progress
- Manage your food orders

Use /help to see all available commands.
                `);
                break;

            case '/help':
                await this.sendMessage(chatId, `
📋 Available Commands:

/start - Start the bot
/order - Place a new food order
/status - Check your order status
/nutrition - View your nutrition summary
/help - Show this help message

Need assistance? Contact support at support@musclemate.com
                `);
                break;

            case '/nutrition':
                await this.sendNutritionSummary(chatId);
                break;

            default:
                await this.sendMessage(chatId, "I don't recognize that command. Use /help to see available commands.");
        }
    }

    async sendNutritionSummary(chatId) {
        // In a real implementation, this would fetch from your backend
        const summary = `
📊 Your Weekly Nutrition Summary:

🔸 Daily Calorie Target: 2500 kcal
🔸 Protein: 150g
🔸 Carbs: 300g
🔸 Fats: 80g

Progress This Week:
✅ Protein: 90% of target
✅ Calories: 95% of target
⚠️ Carbs: 75% of target
✅ Fats: 85% of target

Use /order to get recommended meals based on these targets!
        `;

        await this.sendMessage(chatId, summary);
    }

    async sendOrderConfirmation(userId, orderDetails) {
        try {
            const message = this.formatOrderMessage(orderDetails);
            const keyboard = {
                inline_keyboard: [
                    [
                        { text: '✅ Confirm Order', callback_data: 'confirm_order' },
                        { text: '❌ Cancel', callback_data: 'cancel_order' }
                    ]
                ]
            };

            const response = await fetch(`${this.TELEGRAM_API}/sendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: userId,
                    text: message,
                    parse_mode: 'HTML',
                    reply_markup: keyboard
                })
            });
            return await response.json();
        } catch (error) {
            console.error('Error sending Telegram message:', error);
            throw error;
        }
    }

    formatOrderMessage(orderDetails) {
        return `
🏋️‍♂️ <b>MuscleMate Nutrition Order</b> 🥗

📋 <b>Weekly Nutrition Analysis Results:</b>
${orderDetails.nutritionSummary}

🛒 <b>Recommended Food Items:</b>
${orderDetails.recommendedItems.map(item => `- ${item.name} (${item.price})`).join('\n')}

💰 <b>Total Amount:</b> ${orderDetails.totalAmount}

🔄 <b>Order Status:</b> Pending Confirmation

Please confirm your order using the buttons below.
`;
    }

    async handleCallbackQuery(callbackQuery) {
        const chatId = callbackQuery.message.chat.id;
        const data = callbackQuery.data;

        switch (data) {
            case 'confirm_order':
                await this.processOrderConfirmation(chatId);
                break;
            case 'cancel_order':
                await this.sendMessage(chatId, '❌ Order cancelled. Feel free to place a new order anytime!');
                break;
        }
    }

    async processOrderConfirmation(chatId) {
        try {
            const confirmationMessage = `
✅ <b>Order Confirmed!</b>

🔢 Order ID: ${Date.now()}
⏱ Estimated Delivery: 30-45 minutes

Your order has been confirmed and will be processed through our delivery partner.

Track your order status using /status

Thank you for using MuscleMate! 💪
`;
            
            await this.sendMessage(chatId, confirmationMessage);
        } catch (error) {
            console.error('Error processing order:', error);
            throw error;
        }
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
⌚ *Order Time:* ${new Date().toLocaleTimeString()}

_Your order has been placed successfully! The restaurant will prepare your meal according to the selected time slot._
            `;

            await this.sendMessage(null, message);
            return true;
        } catch (error) {
            console.error('Failed to send order:', error);
            throw new Error('Failed to send order notification');
        }
    }

    async sendMessage(chatId = null, text, parseMode = 'Markdown') {
        try {
            if (!text) {
                throw new Error('Message text is required');
            }

            const targetChatId = chatId || this.CHAT_ID;
            const response = await fetch(`${this.TELEGRAM_API}/sendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: targetChatId,
                    text: text,
                    parse_mode: parseMode
                })
            });

            const result = await response.json();
            
            if (!result.ok) {
                throw new Error(`Telegram API Error: ${result.description}`);
            }

            return result;
        } catch (error) {
            console.error('Failed to send message:', error);
            throw new Error(`Failed to send message: ${error.message}`);
        }
    }

    async sendOrderNotification(orderDetails) {
        try {
            const message = `
🍽 *New Order Received!*

📋 *Order Details:*
- Meal: ${orderDetails.meal}
- Restaurant: ${orderDetails.restaurant}
- Price: ₹${orderDetails.price}

⏰ Order Time: ${new Date().toLocaleTimeString()}
            `;

            await this.sendMessage(null, message);
            return true;
        } catch (error) {
            console.error('Failed to send order notification:', error);
            throw error;
        }
    }
}

// Export the service
export const telegramBot = new TelegramBotService();

// Test the bot connection when the module loads
telegramBot.sendMessage(null, '🤖 MuscleMate Bot is online!')
    .catch(error => console.error('Bot connection test failed:', error));
