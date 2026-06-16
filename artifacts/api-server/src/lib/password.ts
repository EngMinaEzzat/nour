/**
 * Validates password complexity:
 * - At least 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 digit
 * - At least 1 special character
 * 
 * Returns an Arabic error message if invalid, or null if valid.
 */
export function validatePasswordComplexity(password: string): string | null {
  if (password.length < 8) {
    return "كلمة المرور قصيرة جدًا (يجب أن تكون 8 أحرف على الأقل)";
  }
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  
  if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
    return "يجب أن تحتوي كلمة المرور على حرف كبير، حرف صغير، رقم، ورمز خاص واحد على الأقل";
  }
  return null;
}
