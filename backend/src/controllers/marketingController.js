import { query } from '../db.js';

export const subscribeNewsletter = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Please provide a valid email address' });
        }

        await query(
            `INSERT INTO newsletter_subscribers (email) 
       VALUES ($1) 
       ON CONFLICT (email) DO UPDATE 
       SET is_active = true`,
            [email.toLowerCase()]
        );

        res.status(200).json({ message: 'Subscribed successfully' });
    } catch (error) {
        console.error('Newsletter error:', error);
        res.status(500).json({ error: 'Failed to subscribe' });
    }
};

export const getSubscribers = async (req, res) => {
    try {
        const result = await query('SELECT * FROM newsletter_subscribers ORDER BY subscribed_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching subscribers:', error);
        res.status(500).json({ error: 'Failed to fetch subscribers' });
    }
};
