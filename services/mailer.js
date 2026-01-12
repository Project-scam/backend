//==========================================================
// File: mailer.js
// Script creazione servizio invio mail
// @author: "catalin.groppo@allievi.itsdigitalacademy.com"
//          "sandu.batrincea@allievi.itsdigitalacademy.com"
//          "mattia.zara@allievi.itsdigitalacademy.com"
//          "andrea.villari@allievi.itsdigitalacademy.com"
// @version: "1.0.0 2026-01-08"
//==========================================================

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: "smtp.libero.it",
    port: 587,
    secure: false, // true per 465, false per altre porte
    auth: {
        user: 'pwscamits-2526@libero.it',
        pass: process.env.LIBERO_PASS
    },
    tls: {
        rejectUnauthorized: false // Accetta certificati self-signed
    },
    connectionTimeout: 10000, // 10 secondi
    greetingTimeout: 10000,
    socketTimeout: 10000
});

module.exports = transporter;
