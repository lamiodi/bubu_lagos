import { query } from '../db.js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const submitContactMessage = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({
        error: 'Name, email, and message are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Please provide a valid email address'
      });
    }

    // Save contact message to database
    const result = await query(
      `INSERT INTO contact_messages (name, email, phone, subject, message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, email, phone, subject, message]
    );

    const contactMessage = result.rows[0];

    // Send email notification to admin
    try {
      await sendContactNotificationEmail({
        name,
        email,
        phone,
        subject,
        message,
        messageId: contactMessage.id,
        createdAt: contactMessage.created_at
      });
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
      // Don't fail the request if email fails, just log it
    }

    // Send auto-reply to customer
    try {
      await sendAutoReplyEmail({
        name,
        email,
        subject
      });
    } catch (autoReplyError) {
      console.error('Failed to send auto-reply email:', autoReplyError);
      // Don't fail the request if auto-reply fails
    }

    res.status(201).json({
      message: 'Contact message submitted successfully',
      contactMessage: {
        id: contactMessage.id,
        name: contactMessage.name,
        email: contactMessage.email,
        subject: contactMessage.subject,
        createdAt: contactMessage.created_at
      }
    });

  } catch (error) {
    console.error('Error submitting contact message:', error);

    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({ error: 'Duplicate submission detected' });
    }

    res.status(500).json({ error: 'Failed to submit contact message' });
  }
};

// Send notification email to admin
async function sendContactNotificationEmail(data) {
  const { name, email, phone, subject, message, messageId, createdAt } = data;

  const emailSubject = subject
    ? `New Contact Message: ${subject}`
    : 'New Contact Message Received';

  const formattedDate = new Date(createdAt).toLocaleString();

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">New Contact Message Received</h2>
      
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Message ID:</strong> ${messageId}</p>
        <p><strong>Received:</strong> ${formattedDate}</p>
        <p><strong>From:</strong> ${name} (${email})</p>
        ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
        ${subject ? `<p><strong>Subject:</strong> ${subject}</p>` : ''}
      </div>
      
      <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
        <h3 style="color: #555; margin-top: 0;">Message:</h3>
        <p style="white-space: pre-wrap; line-height: 1.6;">${message}</p>
      </div>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
        <p>This is an automated notification from Bubu Lagos contact form.</p>
        <p>Please respond to the customer within 24 hours.</p>
      </div>
    </div>
  `;

  const emailText = `
New Contact Message Received

Message ID: ${messageId}
Received: ${formattedDate}
From: ${name} (${email})
${phone ? `Phone: ${phone}` : ''}
${subject ? `Subject: ${subject}` : ''}

Message:
${message}

---
This is an automated notification from Bubu Lagos contact form.
Please respond to the customer within 24 hours.
  `;

  await resend.emails.send({
    from: 'Bubu Lagos <noreply@bubulagos.com>',
    to: [process.env.ADMIN_EMAIL || 'admin@bubulagos.com'],
    subject: emailSubject,
    html: emailHtml,
    text: emailText,
    reply_to: email
  });
}

export const getContactMessages = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const countResult = await query('SELECT COUNT(*) as total FROM contact_messages');
    const total = parseInt(countResult.rows[0].total);

    const result = await query(
      `SELECT * FROM contact_messages
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      messages: result.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching contact messages:', error);
    res.status(500).json({ error: 'Failed to fetch contact messages' });
  }
};

/**
 * [NEW] Mark a contact message as read.
 * Idempotent — calling it twice is a no-op.
 */
export const markMessageRead = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE contact_messages
       SET is_read = true, read_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }
    res.json({ message: 'Message marked as read', contactMessage: result.rows[0] });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
};

// Send auto-reply email to customer
async function sendAutoReplyEmail(data) {
  const { name, email, subject } = data;

  const emailSubject = 'Thank you for contacting Bubu Lagos';

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Thank you for contacting Bubu Lagos!</h2>
      
      <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <p>Dear ${name},</p>
        
        <p>We have received your message${subject ? ` regarding "${subject}"` : ''} and appreciate you taking the time to reach out to us.</p>
        
        <p>Our team typically responds within 24 hours during business days. We'll get back to you as soon as possible.</p>
        
        <p>If your inquiry is urgent, please feel free to call us at our customer service line.</p>
      </div>
      
      <div style="margin-top: 30px; padding: 15px; background-color: #f0f8ff; border-left: 4px solid #4a90e2; border-radius: 3px;">
        <p style="margin: 0; color: #333;"><strong>What to expect next:</strong></p>
        <ul style="margin: 10px 0 0 0; padding-left: 20px;">
          <li>Confirmation of receipt (this email)</li>
          <li>Personalized response from our team</li>
          <li>Follow-up if additional information is needed</li>
        </ul>
      </div>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
        <p>Best regards,</p>
        <p><strong>The Bubu Lagos Team</strong></p>
        <p>Premium Digital Boutique</p>
      </div>
    </div>
  `;

  const emailText = `
Thank you for contacting Bubu Lagos!

Dear ${name},

We have received your message${subject ? ` regarding "${subject}"` : ''} and appreciate you taking the time to reach out to us.

Our team typically responds within 24 hours during business days. We'll get back to you as soon as possible.

If your inquiry is urgent, please feel free to call us at our customer service line.

What to expect next:
- Confirmation of receipt (this email)
- Personalized response from our team
- Follow-up if additional information is needed

Best regards,
The Bubu Lagos Team
Premium Digital Boutique
  `;

  await resend.emails.send({
    from: 'Bubu Lagos <noreply@bubulagos.com>',
    to: [email],
    subject: emailSubject,
    html: emailHtml,
    text: emailText
  });
}