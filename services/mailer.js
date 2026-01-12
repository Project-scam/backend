//==========================================================
// File: mailer.js
// Script creazione servizio invio mail
// @author: "catalin.groppo@allievi.itsdigitalacademy.com"
//          "sandu.batrincea@allievi.itsdigitalacademy.com"
//          "mattia.zara@allievi.itsdigitalacademy.com"
//          "andrea.villari@allievi.itsdigitalacademy.com"
// @version: "1.2.0 2026-01-12"
//==========================================================

const SibApiV3Sdk = require('@getbrevo/brevo');

// Configura il client Brevo (ex Sendinblue)
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
apiInstance.setApiKey(
    SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
    process.env.BREVO_API_KEY || ''
);

/**
 * Wrapper per rendere Brevo compatibile con l'interfaccia nodemailer
 */
const transporter = {
    sendMail: async (mailOptions) => {
        try {
            // Estrai l'email dal formato "Nome <email@example.com>" se presente
            const extractEmail = (emailStr) => {
                const match = emailStr.match(/<(.+)>/);
                return match ? match[1] : emailStr;
            };

            const extractName = (emailStr) => {
                const match = emailStr.match(/^"?([^"<]+)"?\s*</);
                return match ? match[1].trim() : undefined;
            };

            const fromEmail = extractEmail(mailOptions.from);
            const fromName = extractName(mailOptions.from) || 'PWSCAM Support';

            const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
            sendSmtpEmail.sender = { name: fromName, email: fromEmail };
            sendSmtpEmail.to = [{ email: mailOptions.to }];
            sendSmtpEmail.subject = mailOptions.subject;
            sendSmtpEmail.textContent = mailOptions.text;
            sendSmtpEmail.htmlContent = mailOptions.html;

            const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
            console.log('[MAILER] Email sent successfully via Brevo. Message ID:', result.messageId);
            return result;
        } catch (error) {
            console.error('[MAILER] Brevo error:', error.response?.text || error.message);
            throw error;
        }
    }
};

module.exports = transporter;
