// Email Service — sends shortlist notifications via Gmail SMTP

const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

class EmailService {
  async sendShortlistEmail({ candidateEmail, candidateName, jobTitle, company, score }) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('Email credentials not configured. Add EMAIL_USER and EMAIL_PASS to .env');
    }

    const mailOptions = {
      from: `"eResumeier" <${process.env.EMAIL_USER}>`,
      to: candidateEmail,
      subject: `Congratulations! You've been shortlisted for ${jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">eResumeier</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0;">Intelligent Resume Matching Platform</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
            <h2 style="color: #1e293b; margin-top: 0;">Congratulations, ${candidateName}!</h2>
            
            <p style="color: #475569; line-height: 1.6;">
              We are pleased to inform you that your resume has been <strong>shortlisted</strong> for the following position:
            </p>
            
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #1e293b; margin: 0 0 8px;">${jobTitle}</h3>
              <p style="color: #6366f1; margin: 0 0 8px;">${company || 'Company'}</p>
              <p style="color: #059669; font-weight: bold; margin: 0;">Match Score: ${score}%</p>
            </div>
            
            <p style="color: #475569; line-height: 1.6;">
              Your profile was evaluated using our AI-powered matching algorithm and was found to be a strong fit 
              for this role based on your skills, experience, and qualifications.
            </p>
            
            <p style="color: #475569; line-height: 1.6;">
              The hiring team will be in touch with you shortly regarding the next steps in the recruitment process.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;">
            
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">
              This email was sent by eResumeier — Intelligent Resume Matching Platform.<br>
              Powered by Manhattan Distance Scoring & Gale-Shapley Stable Marriage Algorithm.
            </p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Shortlist email sent to ${candidateEmail} for ${jobTitle} (messageId: ${info.messageId})`);
    return info;
  }
}

module.exports = new EmailService();
