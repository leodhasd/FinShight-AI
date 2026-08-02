/**
 * PDF Password Service
 *
 * Handles detection and decryption of password-protected PDF bank statements.
 *
 * SECURITY GUARANTEES:
 * - Password is stored only in a local variable within each function call.
 * - Password is NEVER logged, saved, cached, or transmitted outside the current request.
 * - Password is automatically garbage-collected when the function scope exits.
 */

const { PDFParse, PasswordException } = require('pdf-parse');

/**
 * Check if a PDF buffer is password-protected.
 *
 * Attempts to load the PDF without a password. If PDFParse throws a
 * PasswordException, the PDF is protected.
 *
 * @param {Buffer} buffer - Raw PDF file buffer
 * @returns {Promise<boolean>} - true if password-protected, false if open
 */
async function isPasswordProtected(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 100) {
    return false;
  }

  let parser = null;
  try {
    parser = new PDFParse({
      data: buffer,
      verbosity: 0
    });
    await parser.load();
    // Successfully loaded without password → not protected
    return false;
  } catch (err) {
    // PasswordException means the PDF requires a password
    if (err instanceof PasswordException || err.name === 'PasswordException') {
      return true;
    }
    // Any other error (corrupted PDF, etc.) → not password-protected
    return false;
  } finally {
    // Clean up the parser instance
    if (parser && typeof parser.destroy === 'function') {
      try { parser.destroy(); } catch { /* ignore cleanup errors */ }
    }
  }
}

/**
 * Unlock (decrypt) a password-protected PDF and return its text content.
 *
 * The password is a local variable that:
 * - Exists only in this function's scope.
 * - Is never logged, stored, cached, or sent anywhere.
 * - Is immediately eligible for garbage collection when the function returns.
 *
 * @param {Buffer} buffer - Raw PDF file buffer
 * @param {string} password - The PDF owner/user password
 * @returns {Promise<string>} - Decrypted PDF text content
 * @throws {Error} - PasswordException for wrong password, other errors for corrupted/unsupported PDFs
 */
async function unlockPDF(buffer, password) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Invalid PDF buffer');
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    throw new Error('Password is required');
  }

  let parser = null;
  try {
    // Pass the password in options to pdfjs-dist's getDocument()
    parser = new PDFParse({
      data: buffer,
      password: password,   // <-- password used only here, in memory
      verbosity: 0
    });

    await parser.load();
    const result = await parser.getText();
    const text = (result && result.text) ? result.text : '';
    return text;
  } catch (err) {
    // Re-throw PasswordException as-is for the caller to handle
    if (err instanceof PasswordException || err.name === 'PasswordException') {
      throw err;
    }

    // Wrap all other errors with clean messages, never expose internals
    const msg = (err && err.message) || '';
    if (/unsupported|encryption|format|corrupt|invalid/i.test(msg)) {
      throw new Error('This PDF uses an unsupported encryption format or is corrupted.');
    }
    if (/timeout|abort/i.test(msg)) {
      throw new Error('PDF decryption timed out. Please try again.');
    }
    throw new Error('Failed to unlock the PDF. Please verify the file is valid.');
  } finally {
    // Clean up the parser instance
    if (parser && typeof parser.destroy === 'function') {
      try { parser.destroy(); } catch { /* ignore cleanup errors */ }
    }
  }
}

/**
 * Verify that a password is correct for a given PDF buffer.
 *
 * This is a lightweight check that attempts to load the PDF with the
 * provided password and verifies that text can be extracted.
 *
 * @param {Buffer} buffer - Raw PDF file buffer
 * @param {string} password - The password to verify
 * @returns {Promise<boolean>} - true if password is correct
 */
async function verifyPDFPassword(buffer, password) {
  try {
    await unlockPDF(buffer, password);
    return true;
  } catch (err) {
    if (err instanceof PasswordException || err.name === 'PasswordException') {
      return false;
    }
    // For other errors, rethrow
    throw err;
  }
}

module.exports = {
  isPasswordProtected,
  unlockPDF,
  verifyPDFPassword,
  PasswordException
};

