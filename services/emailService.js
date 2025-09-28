const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // Configuración básica para desarrollo
    this.transporter = nodemailer.createTransport({
      service: 'gmail', // Puedes cambiar según tu proveedor
      auth: {
        user: process.env.EMAIL_USER || 'test@test.com',
        pass: process.env.EMAIL_PASS || 'testpass'
      }
    });
  }

  // Enviar código de verificación
  async sendVerificationCode(email, code, nombreUsuario) {
    try {
      // Verificar si las variables están configuradas
      console.log('🔧 Configuración de email:');
      console.log('  EMAIL_USER:', process.env.EMAIL_USER ? '✅ configurado' : '❌ NO configurado');
      console.log('  EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ configurado' : '❌ NO configurado');
      console.log('  EMAIL_FROM:', process.env.EMAIL_FROM || 'por defecto');

      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        throw new Error('Variables de email no configuradas correctamente');
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'MATRICULATEC <noreply@matriculatec.com>',
        to: email,
        subject: 'Código de verificación - MATRICULATEC',
        html: `
          <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #1e3a8a; margin: 0;">MATRICULATEC</h1>
                <p style="color: #666; margin: 5px 0;">Sistema de Gestión Académica</p>
              </div>
              
              <h2 style="color: #333; margin-bottom: 20px;">¡Hola ${nombreUsuario}!</h2>
              
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Has solicitado crear una cuenta en MATRICULATEC. Para completar tu registro, 
                necesitas verificar tu dirección de email.
              </p>
              
              <div style="background-color: #f8fafc; border: 2px dashed #3b82f6; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
                <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Tu código de verificación es:</p>
                <div style="font-size: 32px; font-weight: bold; color: #1e3a8a; letter-spacing: 3px; background-color: white; padding: 15px; border-radius: 5px; border: 1px solid #e5e7eb;">
                  ${code}
                </div>
              </div>
              
              <p style="color: #666; font-size: 14px; line-height: 1.6;">
                <strong>Importante:</strong> Este código expira en 15 minutos. Si no solicitaste este registro, 
                puedes ignorar este email.
              </p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
                <p style="color: #999; font-size: 12px; margin: 0;">
                  © 2025 MATRICULATEC - Universidad Tecnológica del Uruguay
                </p>
              </div>
            </div>
          </div>
        `
      };

      console.log('📧 Procediendo a enviar email a:', email);
      console.log('📋 Config de Gmail - User:', process.env.EMAIL_USER);
      
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email de verificación enviado correctamente');
      console.log('  - MessageID:', info.messageId);
      console.log('  - Accepted:', info.accepted);
      console.log('  - Rejected:', info.rejected);
      return info;
    } catch (error) {
      console.error('❌ Error enviando email de verificación:');
      console.error('  - Código del error:', error.code);
      console.error('  - Mensaje:', error.message);
      console.error('  - Respuesta del servidor:', error.response);
      throw error;
    }
  }

  // Método para configurar en desarrollo sin email real
  async sendVerificationCodeDevelopment(email, code, nombreUsuario) {
    console.log(`
🔐 ===== CÓDIGO DE VERIFICACIÓN (DESARROLLO) =====
📧 Email: ${email}
👤 Usuario: ${nombreUsuario}
🔢 Código: ${code}
📅 Válido por: 15 minutos
=======================================================
    `);
    
    // En desarrollo, solo mostraremos el código en consola
    // En producción usarías el método sendVerificationCode
    return { messageId: 'development-' + Date.now() };
  }
}

module.exports = new EmailService();
